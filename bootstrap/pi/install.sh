#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PI_HOME="${PI_HOME:-$HOME/.pi/agent}"

mkdir -p "$PI_HOME/agents"

cp "$ROOT/pi.AGENTS.md" "$PI_HOME/AGENTS.md"
cp "$ROOT/agents/"*.md "$PI_HOME/agents/"

cat <<EOF
Installed Pi config into: $PI_HOME

Copied:
- AGENTS.md from pi.AGENTS.md
- agents from agents/

Note:
- Install extensions and skills separately with:
  pi install git:github.com/lucasscarioca/artifacts
EOF
