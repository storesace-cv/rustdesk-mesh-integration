#!/usr/bin/env bash
#
# Actualiza o branch local "my-rustdesk-mesh-integration"
# a partir do branch remoto "origin/main", SEM NUNCA fazer push.
# Apenas prepara o teu branch local para depois ser enviado para o droplet.

set -euo pipefail

BRANCH_LOCAL="my-rustdesk-mesh-integration"
BRANCH_REMOTE="main"
REPO_DIR="$(pwd)"

echo "[update_local_branch] Repositório: $REPO_DIR"
echo "[update_local_branch] A atualizar $BRANCH_LOCAL a partir de origin/$BRANCH_REMOTE"

# Garantir que estamos no repositório
cd "$REPO_DIR"

# Buscar atualizações do GitHub
echo "[update_local_branch] git fetch origin"
git fetch origin

# Garantir que o branch local existe
if ! git show-ref --verify --quiet "refs/heads/$BRANCH_LOCAL"; then
  echo "[update_local_branch] Branch local não existe. Criar a partir de origin/$BRANCH_REMOTE"
  git checkout -b "$BRANCH_LOCAL" "origin/$BRANCH_REMOTE"
else
  echo "[update_local_branch] Checkout para $BRANCH_LOCAL"
  git checkout "$BRANCH_LOCAL"
  echo "[update_local_branch] Merge de origin/$BRANCH_REMOTE → $BRANCH_LOCAL"
  git merge --ff-only "origin/$BRANCH_REMOTE"
fi

echo "[update_local_branch] DONE. Branch '$BRANCH_LOCAL' agora está sincronizado com 'origin/$BRANCH_REMOTE'."