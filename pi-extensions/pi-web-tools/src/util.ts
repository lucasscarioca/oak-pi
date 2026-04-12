import type { SearchResultItem, WebFetchInput, WebFetchResolvedInput, WebSearchInput, WebSearchResolvedInput } from "./types.js";

export const DEFAULT_MAX_RESULTS = 5;
export const MAX_RESULTS = 10;
export const DEFAULT_FETCH_MAX_CHARS = 20_000;
export const MAX_FETCH_MAX_CHARS = 100_000;

export function normalizeSearchInput(input: WebSearchInput): WebSearchResolvedInput {
  const query = input.query?.trim();
  const url = input.url?.trim();

  if (!!query === !!url) {
    throw new Error("websearch requires exactly one of `query` or `url`.");
  }

  if (url) validateUrl(url, "websearch url");

  return {
    query,
    url,
    depth: input.depth ?? "standard",
    maxResults: clampInteger(input.maxResults, 1, MAX_RESULTS, DEFAULT_MAX_RESULTS),
  };
}

export function normalizeFetchInput(input: WebFetchInput): WebFetchResolvedInput {
  const url = input.url?.trim();
  if (!url) throw new Error("webfetch requires `url`.");
  validateUrl(url, "webfetch url");

  return {
    url,
    maxChars: clampInteger(input.maxChars, 1_000, MAX_FETCH_MAX_CHARS, DEFAULT_FETCH_MAX_CHARS),
  };
}

export function validateUrl(value: string, label = "url"): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid ${label}: only http/https URLs are supported.`);
  }
}

export function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.trunc(value);
  return Math.max(min, Math.min(max, rounded));
}

export function dedupeResults(results: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  const output: SearchResultItem[] = [];
  for (const result of results) {
    if (seen.has(result.url)) continue;
    seen.add(result.url);
    output.push(result);
  }
  return output;
}

export function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  const normalized = text.trim();
  if (normalized.length <= maxChars) return { text: normalized, truncated: false };
  return {
    text: `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`,
    truncated: true,
  };
}

export function coerceString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = coerceString(value);
    if (text) return text;
  }
  return undefined;
}

export function toSnippet(value: unknown, fallback?: unknown): string | undefined {
  if (Array.isArray(value)) {
    const text = value.map((item) => coerceString(item)).filter(Boolean).join("\n\n");
    return text || toSnippet(fallback);
  }
  return firstNonEmptyString(value, fallback);
}
