#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run scripts/update_to_droplet.sh non-interactively and collect logs.
# Usage: set env vars below, then run ./scripts/run-deploy-and-collect.sh "Commit message"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Ensure child scripts see these control flags
RUN_SUPABASE="${RUN_SUPABASE:-true}"
UPLOAD_DROPLET_SECRETS="${UPLOAD_DROPLET_SECRETS:-false}"
export RUN_SUPABASE UPLOAD_DROPLET_SECRETS
# Default droplet host (can be overridden by env var)
DROPLET_HOST="${DROPLET_HOST:-root@142.93.106.94}"

# If a credentials file is available, source it to populate SUPABASE_* vars.
# Default path (user-local) - change if your credentials file lives elsewhere.
DEFAULT_SUPABASE_CREDS_FILE="/Users/jorgepeixinho/Documents/NetxCloud/projectos/bwb/desenvolvimento/supabase-credentials.txt"
SUPABASE_CREDENTIALS_FILE="${SUPABASE_CREDENTIALS_FILE:-$DEFAULT_SUPABASE_CREDS_FILE}"
if [ -f "$SUPABASE_CREDENTIALS_FILE" ]; then
  echo "[deploy-wrapper] Sourcing Supabase credentials from $SUPABASE_CREDENTIALS_FILE"
  # shellcheck disable=SC1090
  # credentials file must contain valid 'export KEY=value' lines
  source "$SUPABASE_CREDENTIALS_FILE"
fi

MSG="${1:-Non-interactive deploy from laptop}"
LOGDIR="./deploy-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOGDIR"

echo "[deploy-wrapper] Starting. Logs will be saved into $LOGDIR"

# Verify update_to_droplet.sh exists
if [ ! -x "$ROOT_DIR/scripts/update_to_droplet.sh" ] && [ -f "$ROOT_DIR/scripts/update_to_droplet.sh" ]; then
  chmod +x "$ROOT_DIR/scripts/update_to_droplet.sh" || true
fi
if [ ! -f "$ROOT_DIR/scripts/update_to_droplet.sh" ]; then
  echo "[deploy-wrapper] ERROR: scripts/update_to_droplet.sh not found in repo root" >&2
  exit 1
fi

echo "[deploy-wrapper] Running update_to_droplet.sh (auto-answer 'yes' to remote deploy prompt)"
if ! yes | "$ROOT_DIR/scripts/update_to_droplet.sh" "$MSG" >"$LOGDIR/update_to_droplet.stdout" 2>"$LOGDIR/update_to_droplet.stderr"; then
  echo "[deploy-wrapper] update_to_droplet.sh failed. See $LOGDIR/update_to_droplet.stderr" >&2
  echo "--- STDOUT ---"
  sed -n '1,200p' "$LOGDIR/update_to_droplet.stdout" || true
  echo "--- STDERR ---"
  sed -n '1,200p' "$LOGDIR/update_to_droplet.stderr" || true
  exit 1
fi

echo "[deploy-wrapper] update_to_droplet.sh finished successfully. Logs at $LOGDIR/update_to_droplet.*"

# Optional: SSH to droplet and collect status (read-only checks)
echo "[deploy-wrapper] Collecting droplet status via SSH: $DROPLET_HOST"
SSH_LOG="$LOGDIR/droplet-ssh.stdout"
SSH_ERR="$LOGDIR/droplet-ssh.stderr"

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$DROPLET_HOST" bash -s >"$SSH_LOG" 2>"$SSH_ERR" <<'SSH_EOF'
echo "PWD: $(pwd)"
cd /opt/rustdesk-frontend || cd /opt/rustdesk-mesh-integration || true
echo "GIT: $(git rev-parse --short HEAD 2>/dev/null || echo 'no-git')"
echo "BRANCH: $(git branch --show-current 2>/dev/null || true)"
echo "LAST 5 commits:"
git --no-pager log -n 5 --oneline 2>/dev/null || true
echo "Service status:"
systemctl status rustdesk-frontend.service --no-pager || true
echo "Last 200 journal lines:"
journalctl -u rustdesk-frontend.service -n 200 --no-pager || true
SSH_EOF

echo "[deploy-wrapper] Droplet checks saved to $LOGDIR (stdout/stderr)."
echo "Done. Logs: $LOGDIR"

exit 0
