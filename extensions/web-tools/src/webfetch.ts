import { Type } from "@sinclair/typebox";
import { fetchViaCurl } from "./curl.js";
import { ExaClient } from "./exa.js";
import { loadRuntimeSettings } from "./settings.js";
import type { WebFetchOutput } from "./types.js";
import { normalizeFetchInput } from "./util.js";

export const WebFetchParams = Type.Object({
  url: Type.String({ description: "URL to fetch content from" }),
  maxChars: Type.Optional(
    Type.Integer({
      minimum: 1000,
      maximum: 100000,
      description: "Maximum number of characters to return",
      default: 20000,
    }),
  ),
});

export async function executeWebFetch(
  params: { url: string; maxChars?: number },
  ctx: { cwd: string },
  signal?: AbortSignal,
  deps: {
    exaContents?: (url: string, maxChars: number, signal?: AbortSignal) => Promise<WebFetchOutput | undefined>;
    curlFetch?: (
      url: string,
      options: { cwd: string; signal?: AbortSignal; maxChars: number },
    ) => Promise<WebFetchOutput>;
  } = {},
): Promise<{ content: { type: "text"; text: string }[]; details: WebFetchOutput }> {
  const input = normalizeFetchInput(params);
  const settings = loadRuntimeSettings();
  const notes: string[] = [];

  if (!settings.exaApiKey) {
    notes.push("Exa API key not configured. Set `EXA_API_KEY` or `PI_WEB_TOOLS_EXA_API_KEY` in the environment that launches pi.");
  }

  const exaContents =
    deps.exaContents ??
    (async (url, maxChars, resolvedSignal) => {
      if (!settings.exaApiKey) return undefined;
      const exa = new ExaClient({ apiKey: settings.exaApiKey });
      const [result] = await exa.contents([url], { maxChars, signal: resolvedSignal });
      return result;
    });
  const curlFetch = deps.curlFetch ?? fetchViaCurl;

  try {
    const result = await exaContents(input.url, input.maxChars, signal);
    if (result?.content) {
      return {
        content: [{ type: "text", text: formatWebFetchOutput(result) }],
        details: result,
      };
    }
  } catch (error) {
    notes.push(`Exa unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const result = await curlFetch(input.url, {
      cwd: ctx.cwd,
      signal,
      maxChars: input.maxChars,
    });
    return {
      content: [{ type: "text", text: formatWebFetchOutput(result) }],
      details: result,
    };
  } catch (error) {
    const curlError = error instanceof Error ? error.message : String(error);
    const lines = ["webfetch failed.", "", "curl error:", curlError];
    if (notes.length > 0) {
      lines.push("", "Context:");
      for (const note of notes) lines.push(`- ${note}`);
    }
    throw new Error(lines.join("\n"));
  }
}

export function formatWebFetchOutput(result: WebFetchOutput): string {
  const lines: string[] = [];
  if (result.title) lines.push(result.title);
  lines.push(result.url);
  lines.push("");
  lines.push(result.content);
  lines.push("", `Backend: ${result.backend}${result.truncated ? " (truncated)" : ""}`);
  return lines.join("\n");
}
