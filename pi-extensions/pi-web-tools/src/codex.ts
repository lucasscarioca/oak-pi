import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CodexRunnerOptions, SearchResultItem, WebSearchResolvedInput } from "./types.js";
import { dedupeResults, firstNonEmptyString } from "./util.js";

const SEARCH_OUTPUT_SCHEMA_PATH = fileURLToPath(new URL("./search-output-schema.json", import.meta.url));
const CODEX_AUTH_PATTERN = /\bauth(?:entication)?\b|login|unauthorized|forbidden|expired session|access token|api key/i;

interface CodexSearchOutput {
  summary: string;
  sources: Array<{ title: string; url: string; snippet?: string }>;
}

export async function runCodexDeepSearch(
  input: WebSearchResolvedInput,
  seedResults: SearchResultItem[],
  options: CodexRunnerOptions,
): Promise<{ summary: string; results: SearchResultItem[] }> {
  const tmpDir = await mkdtemp(join(tmpdir(), "pi-web-tools-"));
  const outputPath = join(tmpDir, "codex-output.json");
  const args = [
    "exec",
    "--json",
    "-c",
    'web_search="live"',
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "--ephemeral",
    "--output-schema",
    SEARCH_OUTPUT_SCHEMA_PATH,
    "--output-last-message",
    outputPath,
    "-",
  ];

  try {
    const prompt = buildPrompt(input, seedResults);
    await runCodexCommand(options.codexPath ?? "codex", args, prompt, options);
    const rawOutput = await readFile(outputPath, "utf-8");
    const parsed = parseOutput(rawOutput);
    return {
      summary: parsed.summary,
      results: dedupeResults(
        parsed.sources.map((source) => ({
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          source: "codex" as const,
        })),
      ).slice(0, input.maxResults),
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export function buildPrompt(input: WebSearchResolvedInput, seedResults: SearchResultItem[]): string {
  const lines = [
    "You are doing deep web research for another coding agent.",
    "Use current web search to improve or broaden the source set.",
    "Return only a JSON object matching the provided schema.",
    "Keep the summary concise.",
    `Limit the final sources to at most ${input.maxResults}.`,
    "Prefer primary and official sources.",
    "If seed results are provided, use them as starting points but improve on them when helpful.",
    "",
    input.query
      ? `Task type: query search\nQuery: ${input.query}`
      : `Task type: similar-links search\nURL: ${input.url}`,
  ];

  if (seedResults.length > 0) {
    lines.push("", "Seed results from Exa:");
    for (const [index, result] of seedResults.entries()) {
      lines.push(`${index + 1}. ${result.title}`);
      lines.push(`   URL: ${result.url}`);
      if (result.snippet) lines.push(`   Snippet: ${result.snippet}`);
    }
  }

  lines.push(
    "",
    "Output JSON shape:",
    '{"summary":"...","sources":[{"title":"...","url":"...","snippet":"..."}]}'
  );

  return lines.join("\n");
}

async function runCodexCommand(
  command: string,
  args: string[],
  stdin: string,
  options: CodexRunnerOptions,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stderr = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const onAbort = () => {
      child.kill("SIGTERM");
      finish(() => reject(new Error("Codex search aborted")));
    };

    if (options.signal?.aborted) {
      onAbort();
      return;
    }

    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdin.setDefaultEncoding("utf-8");
    child.stdin.end(stdin);

    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        finish(() =>
          reject(
            new Error(
              "Could not find `codex`. Install Codex CLI or set `PI_WEB_TOOLS_CODEX_PATH` to its absolute path. Then verify auth with `codex login status` and run `codex login` if needed.",
            ),
          ),
        );
        return;
      }
      finish(() => reject(new Error(`Failed to start Codex CLI: ${error.message}`)));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const message = firstNonEmptyString(stderr) ?? `Codex exited with code ${code ?? 1}`;
        finish(() => reject(new Error(withCodexGuidance(message))));
        return;
      }
      finish(resolve);
    });
  });
}

function parseOutput(raw: string): CodexSearchOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(
      withCodexGuidance(
        `Codex returned invalid JSON output: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(withCodexGuidance("Codex returned invalid JSON output."));
  }

  const summary = firstNonEmptyString((parsed as any).summary);
  const sources = Array.isArray((parsed as any).sources) ? (parsed as any).sources : [];
  if (!summary) throw new Error(withCodexGuidance("Codex returned an empty summary."));

  return {
    summary,
    sources: sources
      .map((source: any) => ({
        title: firstNonEmptyString(source?.title, source?.url) ?? "Untitled",
        url: firstNonEmptyString(source?.url) ?? "",
        snippet: firstNonEmptyString(source?.snippet),
      }))
      .filter((source: { title: string; url: string; snippet?: string }) => source.url),
  };
}

function withCodexGuidance(message: string): string {
  if (CODEX_AUTH_PATTERN.test(message)) {
    return `${message}\n\nCodex authentication may be missing or expired. Check with \`codex login status\` and run \`codex login\` if needed.`;
  }
  return message;
}
