#!/usr/bin/env bash
#
# Para correr no Mac.
# Faz commit + push para o branch my-rustdesk-mesh-integration e depois
# ordena ao droplet que corra update_from_github.sh.

set -euo pipefail

BRANCH="my-rustdesk-mesh-integration"
REMOTE="origin"
MESSAGE="${1:-Sync local changes}"
DROPLET_HOST="root@142.93.106.94"
REMOTE_SCRIPT="/opt/rustdesk-frontend/scripts/update_from_github.sh"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[update_to_droplet] Repo root: $ROOT_DIR"

git status

echo "[update_to_droplet] git add…"
git add .

echo "[update_to_droplet] git commit…"
git commit -m "$MESSAGE" || echo "[update_to_droplet] Nada para commitar."

echo "[update_to_droplet] git push…"
git push "$REMOTE" "$BRANCH"

echo "[update_to_droplet] SSH droplet + update_from_github…"
ssh "$DROPLET_HOST" "bash '$REMOTE_SCRIPT'"

echo "[update_to_droplet] DONE."
