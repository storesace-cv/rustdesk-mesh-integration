#!/usr/bin/env bash
set -euo pipefail

REMOTE_USER="root"
REMOTE_HOST="142.93.106.94"
REMOTE_DIR="/opt/rustdesk-mesh-integration"

echo "[update_to_droplet] A sincronizar código para ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR} ..."

rsync -avz --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".next" \
  ./ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "[update_to_droplet] Sync concluído."
echo "Lembra-te de recompilar e reiniciar o serviço no droplet se necessário."
