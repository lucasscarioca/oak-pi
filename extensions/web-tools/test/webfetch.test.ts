import { describe, expect, test } from "bun:test";
import { executeWebFetch } from "../src/webfetch.js";

describe("executeWebFetch", () => {
  test("uses Exa contents when available", async () => {
    const result = await executeWebFetch(
      { url: "https://example.com" },
      { cwd: process.cwd() },
      undefined,
      {
        exaContents: async () => ({
          title: "Example",
          url: "https://example.com",
          content: "hello from exa",
          backend: "exa",
        }),
        curlFetch: async () => {
          throw new Error("should not be called");
        },
      },
    );

    expect(result.details.backend).toBe("exa");
    expect(result.content[0]?.text).toContain("hello from exa");
  });

  test("falls back to curl", async () => {
    const result = await executeWebFetch(
      { url: "https://example.com" },
      { cwd: process.cwd() },
      undefined,
      {
        exaContents: async () => {
          throw new Error("quota exceeded");
        },
        curlFetch: async () => ({
          url: "https://example.com",
          content: "hello from curl",
          backend: "curl",
        }),
      },
    );

    expect(result.details.backend).toBe("curl");
    expect(result.content[0]?.text).toContain("hello from curl");
  });
});
