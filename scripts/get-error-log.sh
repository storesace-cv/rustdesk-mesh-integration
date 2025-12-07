#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DROPLET_SSH_USER=${DROPLET_SSH_USER:-"root"}
DROPLET_SSH_HOST=${DROPLET_SSH_HOST:-"142.93.106.94"}
DROPLET_DEBUG_LOG_PATH=${DROPLET_DEBUG_LOG_PATH:-"/var/log/rustdesk-mesh/app-debug.log"}

REQUIRED_VARS=("DROPLET_SSH_USER" "DROPLET_SSH_HOST" "DROPLET_DEBUG_LOG_PATH")
missing=()
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var-}" ]]; then
    missing+=("$var")
  fi
done

if (( ${#missing[@]} > 0 )); then
  cat <<USAGE
[ERROR] Missing required environment variables: ${missing[*]}
Usage (defaults are prefilled from SoT):
  DROPLET_SSH_USER=${DROPLET_SSH_USER} \
  DROPLET_SSH_HOST=${DROPLET_SSH_HOST} \
  DROPLET_DEBUG_LOG_PATH=${DROPLET_DEBUG_LOG_PATH} \
    scripts/get-error-log.sh
USAGE
  exit 1
fi

LOCAL_DIR="$ROOT_DIR/logs/droplet"
LOCAL_FILE="${LOCAL_DIR}/app-debug.log"
REMOTE="${DROPLET_SSH_USER}@${DROPLET_SSH_HOST}:${DROPLET_DEBUG_LOG_PATH}"
STEP4_PATTERN="$ROOT_DIR/logs/local-logs-*.tar.gz"
STEP4_TARGET=""
PUBLISH=${PUBLISH:-0}

usage() {
  cat <<'USAGE'
Usage: scripts/get-error-log.sh [--publish]

Downloads the droplet debug log into ./logs/droplet. Use --publish (or PUBLISH=1)
to mirror current ./logs content into ./local-logs/ for GitHub sharing.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --publish)
      PUBLISH=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "[get-error-log] Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

mkdir -p "$LOCAL_DIR"

echo "[get-error-log] Copying ${REMOTE} -> ${LOCAL_FILE}"
if scp "$REMOTE" "$LOCAL_FILE"; then
  echo "[get-error-log] Log retrieved successfully into $LOCAL_DIR."
else
  echo "[get-error-log] Failed to retrieve log from droplet." >&2
  exit 1
fi

shopt -s nullglob
step4_candidates=($STEP4_PATTERN)
shopt -u nullglob

if (( ${#step4_candidates[@]} > 0 )); then
  step4_latest=$(ls -t "${step4_candidates[@]}" | head -n 1)
  step4_basename="$(basename "$step4_latest")"
  STEP4_TARGET="${LOCAL_DIR}/${step4_basename}"
  cp "$step4_latest" "$STEP4_TARGET"
  echo "[get-error-log] Found Step-4 archive: ${step4_latest}. Copied to ${STEP4_TARGET}."
else
  echo "[get-error-log] Warning: No Step-4 archive found. Skipping."
fi

if (( PUBLISH == 1 )); then
  echo "[get-error-log] Publishing ./logs to ./local-logs (staged)"
  PUBLISH_ARGS=("--stage")
  "$ROOT_DIR/scripts/publish-logs-to-github.sh" "${PUBLISH_ARGS[@]}"
else
  echo "[get-error-log] Logs stored locally under ./logs. Run scripts/publish-logs-to-github.sh if you need to share them."
fi

