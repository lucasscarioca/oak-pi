import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { ExaClient } from "./exa.js";
import { loadRuntimeSettings } from "./settings.js";
import { runCodexDeepSearch } from "./codex.js";
import type { SearchResultItem, WebSearchOutput, WebSearchResolvedInput } from "./types.js";
import { dedupeResults, normalizeSearchInput } from "./util.js";

export const WebSearchParams = Type.Object({
  query: Type.Optional(Type.String({ description: "Search the web by query" })),
  url: Type.Optional(Type.String({ description: "Find links related or similar to this URL" })),
  depth: Type.Optional(
    StringEnum(["quick", "standard", "deep"] as const, {
      description:
        "How much effort to spend. quick = fast lookup, standard = normal research, deep = broader research.",
      default: "standard",
    }),
  ),
  maxResults: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 10,
      description: "Maximum number of results to return",
      default: 5,
    }),
  ),
});

export async function executeWebSearch(
  params: { query?: string; url?: string; depth?: "quick" | "standard" | "deep"; maxResults?: number },
  ctx: { cwd: string },
  signal?: AbortSignal,
  deps: {
    exaSearch?: (
      input: WebSearchResolvedInput,
      signal: AbortSignal | undefined,
      notes: string[],
    ) => Promise<{ results: SearchResultItem[]; used: boolean }>;
    codexSearch?: (
      input: WebSearchResolvedInput,
      seedResults: SearchResultItem[],
      options: { cwd: string; signal?: AbortSignal },
    ) => Promise<{ summary: string; results: SearchResultItem[] }>;
  } = {},
): Promise<{ content: { type: "text"; text: string }[]; details: WebSearchOutput }> {
  const input = normalizeSearchInput(params);
  const settings = loadRuntimeSettings();
  const notes: string[] = [];

  if (!settings.exaApiKey) {
    notes.push("Exa API key not configured. Set `EXA_API_KEY` or `PI_WEB_TOOLS_EXA_API_KEY` in the environment that launches pi.");
  }

  const exaSearch =
    deps.exaSearch ??
    ((resolvedInput, resolvedSignal, resolvedNotes) => {
      if (!settings.exaApiKey) return Promise.resolve({ results: [] as SearchResultItem[], used: false });
      return tryExaSearch(settings.exaApiKey, resolvedInput, resolvedSignal, resolvedNotes);
    });
  const codexSearch =
    deps.codexSearch ??
    ((resolvedInput, seedResults, options) =>
      runCodexDeepSearch(resolvedInput, seedResults, {
        cwd: options.cwd,
        signal: options.signal,
        codexPath: settings.codexPath,
      }));

  const exaResults = await exaSearch(input, signal, notes);

  if (input.depth === "deep") {
    try {
      const codex = await codexSearch(input, exaResults.results, {
        cwd: ctx.cwd,
        signal,
      });
      const results = dedupeResults([...codex.results, ...exaResults.results]).slice(0, input.maxResults);
      const details: WebSearchOutput = {
        summary: codex.summary,
        results,
        backend: exaResults.used ? "exa+codex" : "codex",
        notes,
      };
      return { content: [{ type: "text", text: formatWebSearchOutput(input, details) }], details };
    } catch (error) {
      throw new Error(buildWebSearchFailureMessage("deep", notes, error));
    }
  }

  if (exaResults.results.length > 0) {
    const details: WebSearchOutput = {
      summary: summarizeExaResults(input, exaResults.results),
      results: exaResults.results,
      backend: "exa",
      notes,
    };
    return { content: [{ type: "text", text: formatWebSearchOutput(input, details) }], details };
  }

  try {
    const codex = await codexSearch(input, [], {
      cwd: ctx.cwd,
      signal,
    });
    const details: WebSearchOutput = {
      summary: codex.summary,
      results: codex.results,
      backend: "codex",
      notes: notes.length > 0 ? notes : ["Exa unavailable; used Codex fallback."],
    };
    return { content: [{ type: "text", text: formatWebSearchOutput(input, details) }], details };
  } catch (error) {
    throw new Error(buildWebSearchFailureMessage("fallback", notes, error));
  }
}

async function tryExaSearch(
  apiKey: string,
  input: WebSearchResolvedInput,
  signal: AbortSignal | undefined,
  notes: string[],
): Promise<{ results: SearchResultItem[]; used: boolean }> {
  const exa = new ExaClient({ apiKey });
  try {
    const results = input.query
      ? await exa.search(input.query, { depth: input.depth, maxResults: input.maxResults, signal })
      : await exa.findSimilar(input.url!, { depth: input.depth, maxResults: input.maxResults, signal });
    return { results, used: true };
  } catch (error) {
    notes.push(`Exa unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return { results: [], used: false };
  }
}

function buildWebSearchFailureMessage(stage: "deep" | "fallback", notes: string[], error: unknown): string {
  const header =
    stage === "deep"
      ? "websearch failed during deep Codex research."
      : "websearch failed after Exa could not satisfy the request and Codex fallback also failed.";
  const codexError = error instanceof Error ? error.message : String(error);
  const lines = [header, "", "Codex error:", codexError];

  if (notes.length > 0) {
    lines.push("", "Context:");
    for (const note of notes) lines.push(`- ${note}`);
  }

  return lines.join("\n");
}

function summarizeExaResults(input: WebSearchResolvedInput, results: SearchResultItem[]): string {
  if (results.length === 0) {
    return input.query ? `No results found for query: ${input.query}` : `No related links found for URL: ${input.url}`;
  }

  if (input.query) {
    return `Found ${results.length} web result${results.length === 1 ? "" : "s"} for: ${input.query}`;
  }

  return `Found ${results.length} related link${results.length === 1 ? "" : "s"} for: ${input.url}`;
}

export function formatWebSearchOutput(input: WebSearchResolvedInput, output: WebSearchOutput): string {
  const lines: string[] = [];
  lines.push(output.summary);
  lines.push("");
  lines.push("Sources:");

  if (output.results.length === 0) {
    lines.push("none");
  } else {
    for (const [index, result] of output.results.entries()) {
      lines.push(`${index + 1}. ${result.title}`);
      lines.push(`   ${result.url}`);
      if (result.snippet) lines.push(`   ${result.snippet}`);
    }
  }

  if (output.notes && output.notes.length > 0) {
    lines.push("", "Notes:");
    for (const note of output.notes) lines.push(`- ${note}`);
  }

  lines.push("", `Depth: ${input.depth} | Backend: ${output.backend}`);
  return lines.join("\n");
}
