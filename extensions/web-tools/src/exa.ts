import type {
  ExaClientOptions,
  ExaContentsOptions,
  ExaSearchOptions,
  FetchLike,
  SearchResultItem,
  WebFetchOutput,
} from "./types.js";
import { dedupeResults, firstNonEmptyString, toSnippet, truncateText } from "./util.js";

const DEFAULT_BASE_URL = "https://api.exa.ai";

export class ExaClient {
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(options: ExaClientOptions) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async search(query: string, options: ExaSearchOptions): Promise<SearchResultItem[]> {
    const body: Record<string, unknown> = {
      query,
      numResults: options.maxResults,
    };

    if (options.depth === "standard") {
      body.contents = { highlights: { maxCharacters: 2000 } };
    }

    const json = await this.post("/search", body, options.signal);
    return parseSearchResults(json, "exa-search", options.maxResults);
  }

  async findSimilar(url: string, options: ExaSearchOptions): Promise<SearchResultItem[]> {
    const body: Record<string, unknown> = {
      url,
      numResults: options.maxResults,
    };

    if (options.depth === "standard") {
      body.contents = { highlights: { maxCharacters: 2000 } };
    }

    const json = await this.post("/findSimilar", body, options.signal);
    return parseSearchResults(json, "exa-similar", options.maxResults);
  }

  async contents(urls: string[], options: ExaContentsOptions = {}): Promise<WebFetchOutput[]> {
    const json = await this.post(
      "/contents",
      {
        urls,
        text: true,
      },
      options.signal,
    );

    const results = getResultsArray(json);
    return results.map((item) => {
      const url = firstNonEmptyString(item.url) ?? urls[0] ?? "";
      const content = firstNonEmptyString(item.text, item.content, item.markdown, item.html) ?? "";
      const truncated = options.maxChars ? truncateText(content, options.maxChars) : { text: content.trim(), truncated: false };
      return {
        title: firstNonEmptyString(item.title),
        url,
        content: truncated.text,
        backend: "exa" as const,
        contentType: firstNonEmptyString(item.contentType, item.type),
        truncated: truncated.truncated,
      };
    });
  }

  private async post(path: string, body: unknown, signal?: AbortSignal): Promise<any> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });

    const text = await response.text();
    let json: any = undefined;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Exa returned invalid JSON from ${path}.`);
    }

    if (!response.ok) {
      const message = firstNonEmptyString(json?.error, json?.message, text) ?? `Exa request failed (${response.status})`;
      throw new Error(`Exa ${path} failed: ${message}`);
    }

    return json;
  }
}

function getResultsArray(json: any): any[] {
  if (Array.isArray(json?.results)) return json.results;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

function parseSearchResults(
  json: any,
  source: SearchResultItem["source"],
  maxResults: number,
): SearchResultItem[] {
  const results = getResultsArray(json)
    .map((item): SearchResultItem | null => {
      const url = firstNonEmptyString(item.url, item.id);
      if (!url) return null;
      const title = firstNonEmptyString(item.title, item.url, item.id) ?? url;
      return {
        title,
        url,
        snippet: toSnippet(item.highlights, item.text ?? item.snippet),
        publishedDate: firstNonEmptyString(item.publishedDate, item.published_date),
        source,
      };
    })
    .filter((item): item is SearchResultItem => item !== null);

  return dedupeResults(results).slice(0, maxResults);
}
