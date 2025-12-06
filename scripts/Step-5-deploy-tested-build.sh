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
[[ -f "$ROOT_DIR/.next/BUILD_COMMIT" ]] || { log "ERRO: falta .next/BUILD_COMMIT. Corre Step-2 para gerar artefactos alinhados com o código."; exit 1; }
BUILD_COMMIT="$(cat "$ROOT_DIR/.next/BUILD_COMMIT")"
BUILD_BRANCH="$(cat "$ROOT_DIR/.next/BUILD_BRANCH" 2>/dev/null || true)"
BUILD_TIME="$(cat "$ROOT_DIR/.next/BUILD_TIME" 2>/dev/null || true)"
CURRENT_COMMIT="$(git rev-parse HEAD)"
if [[ "$BUILD_COMMIT" != "$CURRENT_COMMIT" ]]; then
  log "ERRO: o artefacto em .next foi construído em $BUILD_TIME (branch '$BUILD_BRANCH', commit $BUILD_COMMIT) mas o código actual está em $CURRENT_COMMIT. Corre Step-2 para gerar um build recente antes do deploy."
  exit 1
fi

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

max_attempts=10
delay_seconds=3
for attempt in $(seq 1 "$max_attempts"); do
  if curl -fsS -I http://127.0.0.1:3000 >/dev/null; then
    echo "[remote] Frontend respondeu na tentativa $attempt/$max_attempts"
    break
  fi

  if [[ "$attempt" -eq "$max_attempts" ]]; then
    echo "[remote][ERROR] Frontend não respondeu em http://127.0.0.1:3000 após $max_attempts tentativas" >&2
    journalctl -u rustdesk-frontend.service -n 50 --no-pager || true
    exit 1
  fi

  echo "[remote] Frontend ainda a iniciar (tentativa $attempt/$max_attempts). A aguardar ${delay_seconds}s..."
  sleep "$delay_seconds"
done
EOF2

log "Deploy concluído com sucesso a partir do build local"
