# Artifacts

Collection of coding artifacts and agent config I use.

Note: this repo is a curated collection of config, extensions, and skills I use. Not every item here was originally created by me.

Agent rules:
- Pi: `pi.AGENTS.md`
- OpenCode: `opencode.AGENTS.md`

## Install Pi setup

Install the root Pi package:

```bash
pi install git:github.com/lucasscarioca/artifacts
```

This installs the resources declared in the root `package.json` manifest:
- extensions from `extensions/`
- skills from `skills/`

## Bootstrap the remaining Pi config

`pi install` does **not** copy over:
- `agents/`
- `pi.AGENTS.md` -> `~/.pi/agent/AGENTS.md`

Use the bootstrap script for those:

```bash
./bootstrap/pi/install.sh
```

Optional custom target:

```bash
PI_HOME=/some/other/pi-agent-dir ./bootstrap/pi/install.sh
```

This copies only:
- `agents/*` -> `~/.pi/agent/agents/`
- `pi.AGENTS.md` -> `~/.pi/agent/AGENTS.md`

## Repo layout

- `agents/` — my Pi agent presets
- `extensions/` — Pi extensions included in the root package
- `skills/` — reusable skills included in the root package
- `bootstrap/` — setup scripts for config that is not covered by `pi install`

### Included Pi extensions

- `handoff` — upstream example: [`handoff.ts`](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/handoff.ts)
- `questionnaire` — upstream example: [`questionnaire.ts`](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/questionnaire.ts)
- `todo` — upstream example: [`todo.ts`](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/todo.ts)
- `subagent` — based on: [`examples/extensions/subagent`](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent)
  - minor adjustments: removed planner, changed default models
- `web-tools` — `websearch` + `webfetch`, built in this repo
- `codex-usage` — checks Codex 5h/weekly usage limits and can pin a compact footer summary (requires a local authenticated `codex` CLI or `PI_CODEX_USAGE_BIN`)
