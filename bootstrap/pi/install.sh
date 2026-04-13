#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PI_HOME="${PI_HOME:-$HOME/.pi/agent}"

mkdir -p "$PI_HOME/agents" "$PI_HOME/extensions/subagent" "$PI_HOME/skills"

cp "$ROOT/pi.AGENTS.md" "$PI_HOME/AGENTS.md"

cp "$ROOT/pi-agents/"*.md "$PI_HOME/agents/"
cp "$ROOT/pi-extensions/handoff.ts" "$PI_HOME/extensions/"
cp "$ROOT/pi-extensions/questionnaire.ts" "$PI_HOME/extensions/"
cp "$ROOT/pi-extensions/todo.ts" "$PI_HOME/extensions/"
cp "$ROOT/pi-extensions/subagent/index.ts" "$PI_HOME/extensions/subagent/"
cp "$ROOT/pi-extensions/subagent/agents.ts" "$PI_HOME/extensions/subagent/"

rm -rf "$PI_HOME/skills/grill-me"
cp -R "$ROOT/skills/grill-me" "$PI_HOME/skills/"

if ! command -v pi >/dev/null 2>&1; then
  echo "error: \`pi\` CLI not found in PATH; needed to install pi-web-tools" >&2
  exit 1
fi

pi install "$ROOT/pi-extensions/pi-web-tools"

cat <<EOF
Installed Pi config into: $PI_HOME

Copied:
- AGENTS.md from pi.AGENTS.md
- agents from pi-agents/
- raw extensions from pi-extensions/
- skills from skills/

Installed with pi:
- pi-extensions/pi-web-tools

EOF
