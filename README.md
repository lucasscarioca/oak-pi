# Artifacts

Collection of coding artifacts and agent config I use.

Note: this repo is a curated collection of config, extensions, and skills I use. Not every item here was originally created by me.

Agent rules:
- Pi: `pi.AGENTS.md`
- OpenCode: `opencode.AGENTS.md`

## Pi setup in this repo

- `pi-agents/` — my Pi agent presets
- `pi-extensions/` — Pi extensions I use
- `skills/` — reusable skills
- `bootstrap/` — setup scripts for new machines

## Bootstrap Pi config

```bash
./bootstrap/pi/install.sh
```

Optional custom target:

```bash
PI_HOME=/some/other/pi-agent-dir ./bootstrap/pi/install.sh
```

This copies:
- `pi-agents/*` -> `~/.pi/agent/agents/`
- `pi-extensions/*` -> `~/.pi/agent/extensions/`
- `skills/*` -> `~/.pi/agent/skills/`

### Included Pi extensions

- `handoff` — upstream example: [`handoff.ts`](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/handoff.ts)
- `questionnaire` — upstream example: [`questionnaire.ts`](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/questionnaire.ts)
- `todo` — upstream example: [`todo.ts`](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/todo.ts)
- `subagent` — based on: [`examples/extensions/subagent`](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent)
  - minor adjustments: removed planner, changed default models
- `pi-web-tools` — `websearch` + `webfetch`, built in this repo

Direct install for `pi-web-tools` also works:

```bash
pi install github:lucasscarioca/artifacts/pi-extensions/pi-web-tools
```
