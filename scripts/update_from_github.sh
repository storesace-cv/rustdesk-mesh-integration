#!/usr/bin/env bash
#
# Synchronize the local working branch with origin/main.
# The goal is to make the local branch an exact copy of origin/main without
# pushing any changes. Safe defaults protect uncommitted work unless
# explicitly overridden via ALLOW_DIRTY_RESET=1.

set -euo pipefail

BRANCH_LOCAL=${BRANCH_LOCAL:-"my-rustdesk-mesh-integration"}
BRANCH_REMOTE=${BRANCH_REMOTE:-"main"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ALLOW_DIRTY_RESET=${ALLOW_DIRTY_RESET:-1}

log() {
  printf '[update_from_github][%s] %s\n' "$(date +"%Y-%m-%dT%H:%M:%S%z")" "$*"
}

cd "$REPO_DIR"
log "Repositório: $REPO_DIR"
log "Sincronizar '$BRANCH_LOCAL' a partir de 'origin/$BRANCH_REMOTE'"

if [[ "$ALLOW_DIRTY_RESET" != "1" ]]; then
  if ! git diff-index --quiet HEAD --; then
    log "ERRO: existem alterações não commitadas em ficheiros rastreados. Exporta ALLOW_DIRTY_RESET=1 para forçar reset hard."
    exit 1
  fi
fi

if ! git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_REMOTE"; then
  log "ERRO: origin/$BRANCH_REMOTE não existe. Verifica o remoto antes de continuar."
  exit 1
fi

log "git fetch --prune origin"
git fetch --prune origin

if git show-ref --verify --quiet "refs/heads/$BRANCH_LOCAL"; then
  log "Checkout para $BRANCH_LOCAL"
  git checkout "$BRANCH_LOCAL"
else
  log "Criar branch $BRANCH_LOCAL a partir de origin/$BRANCH_REMOTE"
  git checkout -b "$BRANCH_LOCAL" "origin/$BRANCH_REMOTE"
fi

log "Reset hard para origin/$BRANCH_REMOTE"
git reset --hard "origin/$BRANCH_REMOTE"
log "Limpar ficheiros não rastreados (git clean -fd)"
git clean -fd
log "Branch '$BRANCH_LOCAL' agora espelha origin/$BRANCH_REMOTE."
