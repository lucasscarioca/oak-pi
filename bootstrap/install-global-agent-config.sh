#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PI_HOME="${PI_HOME:-$HOME/.pi/agent}"

mkdir -p "$PI_HOME/agents"

cp "$ROOT/global.AGENTS.md" "$PI_HOME/AGENTS.md"
cp "$ROOT/agents/"*.md "$PI_HOME/agents/"

cat <<EOF
Installed global Pi agent config into: $PI_HOME

Copied:
- AGENTS.md from global.AGENTS.md
- agents from agents/

Note:
- Install extensions, skills, and prompt templates separately with:
  pi install git:github.com/lucasscarioca/oak-pi
EOF
