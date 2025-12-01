#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/rustdesk-mesh-integration"
BRANCH="my-rustdesk-mesh-integration"
SERVICE_NAME="rustdesk-frontend.service"

echo "[update_from_github] A actualizar código em ${APP_DIR} (branch ${BRANCH})..."

cd "${APP_DIR}"

if [ ! -d ".git" ]; then
  echo "[update_from_github] ERRO: .git não encontrado em ${APP_DIR}."
  exit 1
fi

git fetch origin
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "[update_from_github] A instalar dependências..."
npm install

echo "[update_from_github] A compilar build de produção..."
npm run build

echo "[update_from_github] A reiniciar serviço systemd ${SERVICE_NAME}..."
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "${SERVICE_NAME}"
  sudo systemctl status "${SERVICE_NAME}" --no-pager -l || true
else
  echo "[update_from_github] Aviso: systemctl não encontrado. Reinicia o serviço manualmente."
fi

echo "[update_from_github] Done."
