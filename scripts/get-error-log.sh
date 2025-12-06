#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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
STEP4_PATTERN="logs/local/Step-4-collect-error-logs-*.log"
STEP4_TARGET=""

mkdir -p "$LOCAL_DIR"

echo "[get-error-log] Copying ${REMOTE} -> ${LOCAL_FILE}"
if scp "$REMOTE" "$LOCAL_FILE"; then
  echo "[get-error-log] Log retrieved successfully."
else
  echo "[get-error-log] Failed to retrieve log from droplet." >&2
  exit 1
fi

shopt -s nullglob
step4_candidates=($STEP4_PATTERN)
shopt -u nullglob

if (( ${#step4_candidates[@]} > 0 )); then
  step4_latest=$(ls -t "${step4_candidates[@]}" | head -n 1)
  STEP4_TARGET="${LOCAL_DIR}/step-4-latest.log"
  cp "$step4_latest" "$STEP4_TARGET"
  echo "[get-error-log] Found Step-4 log: ${step4_latest}. Copied to ${STEP4_TARGET}."
else
  echo "[get-error-log] Warning: No Step-4 log found. Skipping."
fi

git add "$LOCAL_FILE"
if [[ -n "$STEP4_TARGET" ]]; then
  git add "$STEP4_TARGET"
  echo "[get-error-log] Adding Step-4 log to commit."
fi

if git diff --cached --quiet; then
  echo "[get-error-log] No changes to commit."
else
  COMMIT_MSG="chore: update droplet debug logs"
  echo "[get-error-log] Committing logs with message: ${COMMIT_MSG}"
  git commit -m "$COMMIT_MSG"
  echo "[get-error-log] Pushing to origin main"
  git push origin main
fi
