#!/usr/bin/env bash
#
# Para correr no droplet (142.93.106.94)
# Actualiza o código a partir do GitHub e reinicia o serviço Next.js.

set -euo pipefail

PROJECT_DIR="/opt/rustdesk-frontend"
REPO_URL="https://github.com/storesace-cv/rustdesk-mesh-integration.git"
BRANCH="my-rustdesk-mesh-integration"
SERVICE_NAME="rustdesk-frontend.service"

echo "[update_from_github] Project dir: $PROJECT_DIR"

mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

if [ ! -d ".git" ]; then
  echo "[update_from_github] Inicializar repositório Git…"
  git init
  git remote add origin "$REPO_URL" || true
fi

echo "[update_from_github] Fetch + checkout branch $BRANCH…"
git fetch origin || true
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
fi

echo "[update_from_github] Pull…"
git pull origin "$BRANCH" || true

echo "[update_from_github] npm install…"
npm install

echo "[update_from_github] npm run build…"
npm run build

echo "[update_from_github] restart service $SERVICE_NAME…"
systemctl restart "$SERVICE_NAME"

echo "[update_from_github] DONE."
