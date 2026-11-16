#!/usr/bin/env bash
# Crea en GitHub los Issues de los requerimientos (uno por archivo NN-*.md de esta carpeta) con TU cuenta.
# Uso en Mac o Linux, una sola vez:  gh auth login   y luego   bash docs/issues/crear-issues.sh
# Si un Issue con el mismo título ya existe, lo salta (se puede ejecutar dos veces sin duplicar).
set -euo pipefail
REPO="${1:-WillC372/FrontendPatSft}"
cd "$(dirname "$0")"
gh auth status >/dev/null 2>&1 || { echo "Primero inicia sesión con: gh auth login"; exit 1; }
gh label create "requerimiento funcional" --repo "$REPO" --color 1f6feb --description "Requerimiento funcional (RF)" --force >/dev/null
gh label create "requerimiento no funcional" --repo "$REPO" --color 8957e5 --description "Requerimiento no funcional (RNF)" --force >/dev/null
gh label create "historia de usuario" --repo "$REPO" --color 0e8a16 --description "Como... quiero... para..." --force >/dev/null
gh label create "estado: hecho" --repo "$REPO" --color 2da44e --description "Implementado y probado en la app publicada" --force >/dev/null
gh label create "estado: parcial" --repo "$REPO" --color d29922 --description "Implementado con una limitación indicada" --force >/dev/null
existing="$(gh issue list --repo "$REPO" --state all --limit 500 --json title --jq '.[].title')"
for f in [0-9][0-9]-*.md; do
  title="$(head -n1 "$f" | sed 's/^# //')"
  if grep -Fxq -- "$title" <<< "$existing"; then echo "Ya existe: $title"; continue; fi
  body="$(mktemp)"
  tail -n +4 "$f" > "$body"
  args=(issue create --repo "$REPO" --title "$title" --body-file "$body")
  IFS=',' read -ra tags <<< "$(sed -n '2p' "$f" | sed 's/^<!-- etiquetas: //; s/ -->$//')"
  for t in "${tags[@]}"; do args+=(--label "$(echo "$t" | xargs)"); done
  gh "${args[@]}"
  rm -f "$body"
done
echo "Listo. Revisa la pestaña Issues de https://github.com/$REPO"
