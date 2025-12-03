#!/usr/bin/env bash
#
# Envia o conteúdo do branch local "my-rustdesk-mesh-integration"
# para o droplet, via rsync.
# NÃO faz build, NÃO mexe em serviços no droplet.
# O droplet só recebe os ficheiros; outro script lá tratará do resto.

set -euo pipefail

# Caminho do repositório no teu Mac
LOCAL_REPO_DIR="/Users/jorgepeixinho/Documents/NetxCloud/projectos/bwb/desenvolvimento/rustdesk-mesh-integration"
LOCAL_BRANCH="my-rustdesk-mesh-integration"

# Destino no droplet
REMOTE_USER="root"
REMOTE_HOST="142.93.106.94"
REMOTE_DIR="/opt/rustdesk-frontend"

echo "[push_to_droplet] Repositório local: $LOCAL_REPO_DIR"
echo "[push_to_droplet] Branch local: $LOCAL_BRANCH"
echo "[push_to_droplet] Destino remoto: $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

# Ir para o repositório local
cd "$LOCAL_REPO_DIR"

# Garantir que estamos no branch certo
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$LOCAL_BRANCH" ]]; then
  echo "[push_to_droplet] Checkout para branch $LOCAL_BRANCH (actual: $CURRENT_BRANCH)…"
  git checkout "$LOCAL_BRANCH"
fi

# Verificar se há alterações não commitadas (para não mandar lixo sem quereres)
if [[ "${SKIP_DIRTY_CHECK:-0}" != "1" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "[push_to_droplet][ERRO] Existem alterações não commitadas neste branch."
    echo "Commita/descarta antes de enviar, ou corre com SKIP_DIRTY_CHECK=1 para ignorar, por ex.:"
    echo "  SKIP_DIRTY_CHECK=1 ./update_to_droplet.sh"
    exit 1
  fi
fi

echo "[push_to_droplet] Criar directório remoto se não existir…"
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"

echo "[push_to_droplet] Enviar ficheiros via rsync…"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  "$LOCAL_REPO_DIR"/ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo "[push_to_droplet] DONE. Código sincronizado com o droplet."
