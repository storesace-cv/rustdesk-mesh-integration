#!/usr/bin/env bash
set -euo pipefail

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
Usage:
  DROPLET_SSH_USER=deploy \
  DROPLET_SSH_HOST=1.2.3.4 \
  DROPLET_DEBUG_LOG_PATH=/var/log/rustdesk-mesh/app-debug.log \
    scripts/get-error-log.sh
USAGE
  exit 1
fi

LOCAL_DIR="local-logs/droplet"
LOCAL_FILE="${LOCAL_DIR}/app-debug.log"
REMOTE="${DROPLET_SSH_USER}@${DROPLET_SSH_HOST}:${DROPLET_DEBUG_LOG_PATH}"

mkdir -p "$LOCAL_DIR"

echo "[get-error-log] Copying ${REMOTE} -> ${LOCAL_FILE}"
if scp "$REMOTE" "$LOCAL_FILE"; then
  echo "[get-error-log] Log retrieved successfully."
else
  echo "[get-error-log] Failed to retrieve log from droplet." >&2
  exit 1
fi
