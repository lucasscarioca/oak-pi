export type SearchDepth = "quick" | "standard" | "deep";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
  publishedDate?: string;
  source: "exa-search" | "exa-similar" | "exa-contents" | "codex" | "curl";
}

export interface WebSearchInput {
  query?: string;
  url?: string;
  depth?: SearchDepth;
  maxResults?: number;
}

export interface WebSearchResolvedInput {
  query?: string;
  url?: string;
  depth: SearchDepth;
  maxResults: number;
}

export interface WebFetchInput {
  url: string;
  maxChars?: number;
}

export interface WebFetchResolvedInput {
  url: string;
  maxChars: number;
}

export interface WebSearchOutput {
  summary: string;
  results: SearchResultItem[];
  backend: "exa" | "codex" | "exa+codex";
  notes?: string[];
}

export interface WebFetchOutput {
  title?: string;
  url: string;
  content: string;
  backend: "exa" | "curl";
  contentType?: string;
  truncated?: boolean;
}

export interface ExaSearchOptions {
  depth: SearchDepth;
  maxResults: number;
  signal?: AbortSignal;
}

export interface ExaContentsOptions {
  maxChars?: number;
  signal?: AbortSignal;
}

export type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

export interface ExaClientOptions {
  apiKey: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
}

export interface CodexRunnerOptions {
  cwd: string;
  signal?: AbortSignal;
  codexPath?: string;
}

export interface CurlFetchOptions {
  cwd: string;
  signal?: AbortSignal;
  maxChars: number;
}
