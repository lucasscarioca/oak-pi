# pi-subagent

Subagent delegation extension included in `oak-pi`.

## What it does

- delegates work to specialized agents in single, parallel, or chain mode
- guarantees that subagents finish with a report back to the main agent
- surfaces the full final report to the main agent instead of truncating it
- keeps the rendered UI view useful for humans while preserving the full tool content for the agent

## Notes

- Based on the upstream `pi` subagent example, but customized here for report surfacing and better final-output handling.
- Subagents use the prompt instructions from `agents/` plus an extra universal report-back instruction injected by the extension.
- The tool returns full reports in `content`, while `details` keeps structured per-subagent results for the UI.

## Modes

- `agent + task` — run one subagent
- `tasks` — run multiple subagents in parallel
- `chain` — run sequential steps, feeding the previous output into `{previous}`
