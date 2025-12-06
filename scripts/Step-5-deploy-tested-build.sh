#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/deploy"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
LOG_FILE="$LOG_DIR/Step-5-deploy-tested-build-$TIMESTAMP.log"
BRANCH=${BRANCH:-"my-rustdesk-mesh-integration"}
REMOTE_USER=${REMOTE_USER:-"root"}
REMOTE_HOST=${REMOTE_HOST:-"142.93.106.94"}
REMOTE_DIR=${REMOTE_DIR:-"/opt/rustdesk-frontend"}
SSH_TARGET="$REMOTE_USER@$REMOTE_HOST"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  printf '[Step-5][%s] %s\n' "$(date +"%Y-%m-%dT%H:%M:%S%z")" "$*"
}

cd "$ROOT_DIR"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  log "ERRO: a branch actual é '$CURRENT_BRANCH'. Faz checkout para '$BRANCH' antes de enviar para o droplet."
  exit 1
fi

[[ -d "$ROOT_DIR/.next" ]] || { log "ERRO: .next não encontrado. Corre Step-2 antes do deploy."; exit 1; }
[[ -d "$ROOT_DIR/node_modules" ]] || { log "ERRO: node_modules não encontrado. Corre Step-2 antes do deploy."; exit 1; }

log "A enviar build já testado para $SSH_TARGET:$REMOTE_DIR (log: $LOG_FILE)"
log "rsync vai calcular checksums para enviar apenas ficheiros alterados desde o último deploy"
rsync -avz --delete --checksum --itemize-changes \
  --exclude ".git" \
  --exclude "logs" \
  --exclude "local-logs" \
  --exclude "supabase/.branches" \
  --exclude "supabase/.temp" \
  "$ROOT_DIR/" "$SSH_TARGET:$REMOTE_DIR/"

log "Reiniciar serviço no droplet usando artefactos existentes (sem recompilar)"
ssh "$SSH_TARGET" bash -s <<EOF2
set -euo pipefail
cd "$REMOTE_DIR"

if [[ ! -d .next ]]; then
  echo "[remote][ERROR] .next não está presente em $REMOTE_DIR. O deploy precisa do Step-2 local." >&2
  exit 1
fi

systemctl restart rustdesk-frontend.service
systemctl status rustdesk-frontend.service --no-pager
curl -fsS -I http://127.0.0.1:3000
EOF2

log "Deploy concluído com sucesso a partir do build local"
