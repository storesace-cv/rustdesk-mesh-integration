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
