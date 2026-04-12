import { describe, expect, test } from "bun:test";
import { normalizeFetchInput, normalizeSearchInput, truncateText } from "../src/util.js";

describe("normalizeSearchInput", () => {
  test("requires exactly one of query or url", () => {
    expect(() => normalizeSearchInput({})).toThrow();
    expect(() => normalizeSearchInput({ query: "x", url: "https://example.com" })).toThrow();
  });

  test("defaults depth and maxResults", () => {
    expect(normalizeSearchInput({ query: "pi" })).toEqual({
      query: "pi",
      url: undefined,
      depth: "standard",
      maxResults: 5,
    });
  });
});

describe("normalizeFetchInput", () => {
  test("validates url and defaults maxChars", () => {
    expect(normalizeFetchInput({ url: "https://example.com" })).toEqual({
      url: "https://example.com",
      maxChars: 20000,
    });
  });
});

describe("truncateText", () => {
  test("truncates oversized text", () => {
    const result = truncateText("abcdef", 4);
    expect(result.truncated).toBe(true);
    expect(result.text).toBe("abc…");
  });
});
