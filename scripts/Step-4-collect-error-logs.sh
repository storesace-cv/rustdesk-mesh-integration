#!/usr/bin/env bash
set -euo pipefail

# Compatibility shim: legacy name now forwards to Step-5 (post-deploy log bundle)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/Step-5-collect-error-logs.sh"

if [[ ! -x "$TARGET" ]]; then
  echo "[Step-4->5] Destino em falta: $TARGET" >&2
  exit 1
fi

echo "[Step-4->5] Script renomeado. A redireccionar para Step-5-collect-error-logs.sh..." >&2
exec "$TARGET" "$@"
