#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/local"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
LOG_FILE="$LOG_DIR/Step-2-build-local-$TIMESTAMP.log"
BRANCH=${BRANCH:-"my-rustdesk-mesh-integration"}

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  printf '[Step-2][%s] %s\n' "$(date +"%Y-%m-%dT%H:%M:%S%z")" "$*"
}

cd "$ROOT_DIR"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  log "ERRO: a branch actual é '$CURRENT_BRANCH'. Faz checkout para '$BRANCH' antes de construir."
  exit 1
fi

log "Iniciar build local do frontend (logs: $LOG_FILE)"
if [[ -d "$ROOT_DIR/node_modules" ]]; then
  log "Detectada pasta node_modules existente – forçar limpeza segura antes do npm ci"
  chmod -R u+w "$ROOT_DIR/node_modules" || log "Aviso: não foi possível ajustar permissões de node_modules"
  if rm -rf "$ROOT_DIR/node_modules"; then
    log "node_modules removido com sucesso"
  else
    TRASH_DIR="$ROOT_DIR/node_modules_trash_$TIMESTAMP"
    log "Aviso: rm -rf falhou (ver logs). A mover node_modules para $TRASH_DIR"
    mv "$ROOT_DIR/node_modules" "$TRASH_DIR"
  fi
fi

if [[ -d "$ROOT_DIR/.next" ]]; then
  log "Detectada pasta .next existente – limpeza preventiva antes do build"
  chmod -R u+w "$ROOT_DIR/.next" || log "Aviso: não foi possível ajustar permissões de .next"
  if rm -rf "$ROOT_DIR/.next"; then
    log ".next removido com sucesso"
  else
    TRASH_NEXT="$ROOT_DIR/.next_trash_$TIMESTAMP"
    log "Aviso: rm -rf de .next falhou (ver logs). A mover .next para $TRASH_NEXT"
    mv "$ROOT_DIR/.next" "$TRASH_NEXT"
  fi
fi

log "npm ci --prefer-offline --no-audit --no-fund"
npm ci --prefer-offline --no-audit --no-fund

log "npm run build"
npm run build

BUILD_META_DIR="$ROOT_DIR/.next"
BUILD_COMMIT_FILE="$BUILD_META_DIR/BUILD_COMMIT"
BUILD_BRANCH_FILE="$BUILD_META_DIR/BUILD_BRANCH"
BUILD_TIME_FILE="$BUILD_META_DIR/BUILD_TIME"

log "Guardar metadados do build em $BUILD_META_DIR"
echo "$(git rev-parse HEAD)" > "$BUILD_COMMIT_FILE"
echo "$CURRENT_BRANCH" > "$BUILD_BRANCH_FILE"
echo "$TIMESTAMP" > "$BUILD_TIME_FILE"

log "Build concluído. Artefactos em $ROOT_DIR/.next"
