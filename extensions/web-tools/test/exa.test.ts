import { describe, expect, test } from "bun:test";
import { ExaClient } from "../src/exa.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ExaClient", () => {
  test("search uses highlights in standard mode", async () => {
    const calls: Array<{ url: string; body: any }> = [];
    const client = new ExaClient({
      apiKey: "test",
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
        return jsonResponse({ results: [{ title: "A", url: "https://a.com", highlights: ["snippet"] }] });
      },
    });

    const results = await client.search("pi", { depth: "standard", maxResults: 5 });
    expect(calls[0]?.url).toBe("https://api.exa.ai/search");
    expect(calls[0]?.body.contents).toEqual({ highlights: { maxCharacters: 2000 } });
    expect(results[0]?.snippet).toBe("snippet");
  });

  test("contents returns extracted text", async () => {
    const client = new ExaClient({
      apiKey: "test",
      fetchImpl: async () =>
        jsonResponse({
          results: [{ title: "Doc", url: "https://a.com", text: "hello world" }],
        }),
    });

    const [result] = await client.contents(["https://a.com"], { maxChars: 100 });
    expect(result).toEqual({
      title: "Doc",
      url: "https://a.com",
      content: "hello world",
      backend: "exa",
      contentType: undefined,
      truncated: false,
    });
  });
});
