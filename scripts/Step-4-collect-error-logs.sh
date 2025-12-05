#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_ROOT="$ROOT_DIR/logs"
LOCAL_LOG_DIR="$LOG_ROOT/local"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
ARCHIVE="$LOG_ROOT/local-logs-$TIMESTAMP.tar.gz"

mkdir -p "$LOG_ROOT"

if [[ ! -d "$LOCAL_LOG_DIR" || -z "$(ls -A "$LOCAL_LOG_DIR" 2>/dev/null)" ]]; then
  echo "[Step-4] Nenhum log local encontrado em $LOCAL_LOG_DIR. Corre os passos anteriores primeiro." >&2
  exit 1
fi

tar -czf "$ARCHIVE" -C "$LOG_ROOT" local

cat <<EOF2
[Step-4] Logs comprimidos em: $ARCHIVE
[Step-4] Envia este ficheiro se precisares de partilhar os erros. Os logs originais permanecem em $LOCAL_LOG_DIR.
EOF2
