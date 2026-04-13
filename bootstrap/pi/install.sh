#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PI_HOME="${PI_HOME:-$HOME/.pi/agent}"

mkdir -p "$PI_HOME/agents" "$PI_HOME/extensions/subagent" "$PI_HOME/extensions/pi-web-tools" "$PI_HOME/skills"

cp "$ROOT/pi.AGENTS.md" "$PI_HOME/AGENTS.md"

cp "$ROOT/pi-agents/"*.md "$PI_HOME/agents/"
cp "$ROOT/pi-extensions/handoff.ts" "$PI_HOME/extensions/"
cp "$ROOT/pi-extensions/questionnaire.ts" "$PI_HOME/extensions/"
cp "$ROOT/pi-extensions/todo.ts" "$PI_HOME/extensions/"
cp "$ROOT/pi-extensions/subagent/index.ts" "$PI_HOME/extensions/subagent/"
cp "$ROOT/pi-extensions/subagent/agents.ts" "$PI_HOME/extensions/subagent/"
rm -rf "$PI_HOME/extensions/pi-web-tools"
cp -R "$ROOT/pi-extensions/pi-web-tools" "$PI_HOME/extensions/"

rm -rf "$PI_HOME/skills/grill-me"
cp -R "$ROOT/skills/grill-me" "$PI_HOME/skills/"

cat <<EOF
Installed Pi config into: $PI_HOME

Copied:
- AGENTS.md from pi.AGENTS.md
- agents from pi-agents/
- global extensions from pi-extensions/
- skills from skills/

EOF
