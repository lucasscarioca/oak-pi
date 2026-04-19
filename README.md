# oak-pi

My Pi agent setup package.

## Extensions

- `subagent` — [README](extensions/subagent/README.md) — delegates work to subagents and surfaces the full final report back to the main agent.
- `web-tools` — [README](extensions/web-tools/README.md) — `websearch` and `webfetch`; requires `EXA_API_KEY` and an authenticated local `codex` CLI for deep/fallback behavior.
- `codex-usage` — [README](extensions/codex-usage/README.md) — Codex usage limit helper and footer summary pinning.
- `worktrees` — [README](extensions/worktrees/README.md) — git worktree helper with seeded sessions.
- `questionnaire` and `todo` — small utility extensions with no separate README.

## Install the package

```bash
pi install git:github.com/lucasscarioca/oak-pi
```

This installs the resources declared in `package.json`:
- extensions from `extensions/`
- skills from `skills/`
- prompt templates from `prompts/`

## Install the global Pi agent config

`pi install` does **not** copy over the repo-local agent presets or global rules.

Use the bootstrap script for that:

```bash
./bootstrap/install-global-agent-config.sh
```

Optional custom target:

```bash
PI_HOME=/some/other/pi-agent-dir ./bootstrap/install-global-agent-config.sh
```

This copies only:
- `agents/*` -> `~/.pi/agent/agents/`
- `global.AGENTS.md` -> `~/.pi/agent/AGENTS.md`

## Repo layout

- `agents/` — my Pi agent presets
- `global.AGENTS.md` — global agent rules copied into `~/.pi/agent/AGENTS.md`
- `extensions/` — Pi extensions included in the package
- `prompts/` — prompt templates included in the package
- `skills/` — reusable skills included in the package
- `bootstrap/` — scripts for repo-local config that `pi install` does not copy

