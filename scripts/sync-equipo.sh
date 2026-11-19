#!/usr/bin/env bash
# Copies the engineering team (agents, coordinator skill, main-branch hook and settings) from this repository, where
# the originals live, to the other three. Usage: ./scripts/sync-equipo.sh ../BackendPatSft ../AIPatSft ../DBPatSft
# The Java repositories (those with pom.xml) get the hook in Java, so they stay in one language.
# Each repository keeps its own CLAUDE.md. Commit the copies in a branch with a pull request (never on main).
set -euo pipefail
src="$(cd "$(dirname "$0")/.." && pwd)/.claude"
[ "$#" -gt 0 ] || { echo "Uso: $0 ../BackendPatSft ../AIPatSft ../DBPatSft"; exit 1; }
for dest in "$@"; do
  [ -d "$dest/.git" ] || { echo "No es un repositorio: $dest"; exit 1; }
  mkdir -p "$dest/.claude"
  rm -rf "$dest/.claude/agents" "$dest/.claude/skills/equipo-ingenieria" "$dest/.claude/hooks/proteger-main.mjs" "$dest/.claude/hooks/ProtegerMain.java"
  mkdir -p "$dest/.claude/skills" "$dest/.claude/hooks"
  cp -R "$src/agents" "$dest/.claude/agents"
  cp -R "$src/skills/equipo-ingenieria" "$dest/.claude/skills/equipo-ingenieria"
  if [ -f "$dest/pom.xml" ]; then
    cp "$src/hooks/ProtegerMain.java" "$dest/.claude/hooks/ProtegerMain.java"
    sed 's#node \\"$CLAUDE_PROJECT_DIR/.claude/hooks/proteger-main.mjs\\"#java \\"$CLAUDE_PROJECT_DIR/.claude/hooks/ProtegerMain.java\\"#' "$src/settings.json" > "$dest/.claude/settings.json"
  else
    cp "$src/hooks/proteger-main.mjs" "$dest/.claude/hooks/proteger-main.mjs"
    cp "$src/settings.json" "$dest/.claude/settings.json"
  fi
  echo "Equipo copiado a $dest"
done
