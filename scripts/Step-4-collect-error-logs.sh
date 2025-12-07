#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_ROOT="$ROOT_DIR/logs"
LOCAL_LOG_DIR="$LOG_ROOT/local"
ARCHIVE_DIR="$LOG_ROOT/archive"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
SEQUENCE_FILE="$LOG_ROOT/.log-sequence"

next_sequence() {
  local current=0
  if [[ -f "$SEQUENCE_FILE" ]]; then
    current=$(cat "$SEQUENCE_FILE" 2>/dev/null || echo 0)
  fi
  current=$((current + 1))
  echo "$current" >"$SEQUENCE_FILE"
  printf "%04d" "$current"
}

RUN_ID="$(next_sequence)"
ARCHIVE_BASENAME="run-${RUN_ID}-local-logs-${TIMESTAMP}.tar.gz"
ARCHIVE="$ARCHIVE_DIR/$ARCHIVE_BASENAME"
LATEST_LINK="$ARCHIVE_DIR/local-logs-latest.tar.gz"

mkdir -p "$ARCHIVE_DIR"

if [[ ! -d "$LOCAL_LOG_DIR" || -z "$(ls -A "$LOCAL_LOG_DIR" 2>/dev/null)" ]]; then
  echo "[Step-4] Nenhum log local encontrado em $LOCAL_LOG_DIR. Corre os passos anteriores primeiro." >&2
  exit 1
fi

tar -czf "$ARCHIVE" -C "$LOG_ROOT" local
ln -sfn "$ARCHIVE_BASENAME" "$LATEST_LINK"

cat <<EOF2
[Step-4] Logs comprimidos em: $ARCHIVE (run-id: $RUN_ID)
[Step-4] 'latest' actualizado para: $LATEST_LINK
[Step-4] Envia este ficheiro se precisares de partilhar os erros. Os logs originais permanecem em $LOCAL_LOG_DIR.
EOF2
