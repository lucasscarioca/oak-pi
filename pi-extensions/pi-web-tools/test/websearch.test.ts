import { describe, expect, test } from "bun:test";
import { executeWebSearch } from "../src/websearch.js";

describe("executeWebSearch", () => {
  test("uses Exa results for standard mode", async () => {
    const result = await executeWebSearch(
      { query: "pi coding agent", depth: "standard", maxResults: 2 },
      { cwd: process.cwd() },
      undefined,
      {
        exaSearch: async () => ({
          used: true,
          results: [
            {
              title: "Pi",
              url: "https://pi.dev",
              snippet: "minimal terminal coding harness",
              source: "exa-search",
            },
          ],
        }),
        codexSearch: async () => {
          throw new Error("should not be called");
        },
      },
    );

    expect(result.details.backend).toBe("exa");
    expect(result.details.results).toHaveLength(1);
    expect(result.content[0]?.text).toContain("https://pi.dev");
  });

  test("uses Codex for deep mode and merges Exa seed results", async () => {
    const result = await executeWebSearch(
      { query: "pi coding agent", depth: "deep", maxResults: 3 },
      { cwd: process.cwd() },
      undefined,
      {
        exaSearch: async () => ({
          used: true,
          results: [
            {
              title: "Pi docs",
              url: "https://pi.dev",
              snippet: "official docs",
              source: "exa-search",
            },
          ],
        }),
        codexSearch: async (_input, seedResults) => ({
          summary: `Deep research based on ${seedResults.length} seed result(s).`,
          results: [
            {
              title: "Pi GitHub",
              url: "https://github.com/badlogic/pi-mono",
              snippet: "repo",
              source: "codex",
            },
          ],
        }),
      },
    );

    expect(result.details.backend).toBe("exa+codex");
    expect(result.details.results).toHaveLength(2);
    expect(result.content[0]?.text).toContain("Deep research based on 1 seed result");
  });

  test("falls back to Codex when Exa is unavailable", async () => {
    const result = await executeWebSearch(
      { query: "pi coding agent", maxResults: 2 },
      { cwd: process.cwd() },
      undefined,
      {
        exaSearch: async (_input, _signal, notes) => {
          notes.push("Exa unavailable: quota exceeded");
          return { used: false, results: [] };
        },
        codexSearch: async () => ({
          summary: "Codex fallback summary",
          results: [
            {
              title: "Pi docs",
              url: "https://pi.dev",
              snippet: "official docs",
              source: "codex",
            },
          ],
        }),
      },
    );

    expect(result.details.backend).toBe("codex");
    expect(result.details.notes).toContain("Exa unavailable: quota exceeded");
  });
});
