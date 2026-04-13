import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { executeWebFetch, WebFetchParams } from "./webfetch.js";
import { executeWebSearch, WebSearchParams } from "./websearch.js";

export default function piWebTools(pi: ExtensionAPI) {
  pi.registerTool({
    name: "websearch",
    label: "Web Search",
    description:
      "Search the web for relevant sources. Use `query` to search by topic or `url` to find similar/related links. `depth` controls effort: quick for fast lookup, standard for normal research, deep for broader research with Codex fallback/deepening.",
    parameters: WebSearchParams,
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      return executeWebSearch(params, { cwd: ctx.cwd }, signal);
    },
    renderCall(args, theme) {
      const target = args.query ? `query:${args.query}` : `url:${args.url}`;
      return new Text(
        theme.fg("toolTitle", theme.bold("websearch ")) +
          theme.fg("accent", target) +
          theme.fg("muted", ` [${args.depth ?? "standard"}]`),
        0,
        0,
      );
    },
  });

  pi.registerTool({
    name: "webfetch",
    label: "Web Fetch",
    description:
      "Fetch clean content from a URL. Prefers Exa contents extraction and falls back to curl when needed.",
    parameters: WebFetchParams,
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      return executeWebFetch(params, { cwd: ctx.cwd }, signal);
    },
    renderCall(args, theme) {
      return new Text(
        theme.fg("toolTitle", theme.bold("webfetch ")) + theme.fg("accent", args.url),
        0,
        0,
      );
    },
  });
}
