# pi-web-tools

Pi extension package with two tools:

- `websearch` — web discovery via Exa, with Codex deep/fallback behavior
- `webfetch` — URL content retrieval via Exa contents, with curl fallback

## Features

### `websearch`
- search by `query`
- find related links by `url`
- `depth: quick | standard | deep`
- hides backend choice from the model
- uses Exa directly via HTTP API
- uses local Codex CLI for deep mode and fallback

### `webfetch`
- fetch clean URL content
- prefers Exa `/contents`
- falls back to `curl`

## Requirements

Runtime:
- Node 22+
- `EXA_API_KEY` for Exa-backed behavior
- authenticated local `codex` CLI for deep mode / fallback
- `curl` available for `webfetch` fallback

Development only:
- Bun 1.3+

Optional env vars:

- `PI_WEB_TOOLS_EXA_API_KEY` — alternative to `EXA_API_KEY`
- `PI_WEB_TOOLS_CODEX_PATH` — explicit path to `codex`
- `CODEX_PATH` — fallback Codex path override

Examples:

```bash
EXA_API_KEY=... pi
```

```bash
export EXA_API_KEY=...
export PI_WEB_TOOLS_CODEX_PATH=/absolute/path/to/codex
pi
```

## Install in pi

Local path:

```bash
pi install /absolute/path/to/pi-extensions/pi-web-tools
```

From GitHub:

```bash
pi install github:lucasscarioca/artifacts/pi-extensions/pi-web-tools
```

## Tool schemas

### `websearch`

```json
{
  "query": "string?",
  "url": "string?",
  "depth": "quick | standard | deep",
  "maxResults": 5
}
```

Exactly one of `query` or `url` is required.

Behavior:
- `quick` → Exa search/similar
- `standard` → Exa search/similar with highlights enrichment
- `deep` → Exa seed + Codex deepening
- Exa failure can fall back to Codex

### `webfetch`

```json
{
  "url": "string",
  "maxChars": 20000
}
```

Behavior:
- Exa `/contents` with `text: true`
- fallback to `curl -L`

## Development

```bash
bun install
bun test
bunx tsc --noEmit -p tsconfig.json
```
