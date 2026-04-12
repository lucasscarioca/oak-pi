import { describe, expect, test } from "bun:test";
import { executeWebFetch } from "../src/webfetch.js";
import { executeWebSearch } from "../src/websearch.js";

describe("error behavior", () => {
  test("websearch includes context when Exa and Codex both fail", async () => {
    await expect(
      executeWebSearch(
        { query: "pi", depth: "standard" },
        { cwd: process.cwd() },
        undefined,
        {
          exaSearch: async (_input, _signal, notes) => {
            notes.push("Exa unavailable: quota exceeded");
            return { used: false, results: [] };
          },
          codexSearch: async () => {
            throw new Error("Could not find `codex`.");
          },
        },
      ),
    ).rejects.toThrow(/Exa unavailable: quota exceeded/);
  });

  test("webfetch includes context when Exa and curl both fail", async () => {
    await expect(
      executeWebFetch(
        { url: "https://example.com" },
        { cwd: process.cwd() },
        undefined,
        {
          exaContents: async () => {
            throw new Error("rate limited");
          },
          curlFetch: async () => {
            throw new Error("curl exited with code 22");
          },
        },
      ),
    ).rejects.toThrow(/rate limited/);
  });
});
