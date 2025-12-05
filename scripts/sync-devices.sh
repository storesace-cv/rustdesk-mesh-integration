#!/usr/bin/env bash
#
# Sincroniza devices.json do MeshCentral -> Supabase (android_devices)
#
# ATENÇÃO:
# - Este script é um baseline. Deve ser alinhado com o script real em
#   /opt/meshcentral/sync-devices.sh no droplet.
# - Requer `jq` instalado.

set -euo pipefail

BASE_DIR="/opt/meshcentral/meshcentral-files/ANDROID"
CONF_JSON="/opt/meshcentral/meshcentral-data/android-users.json"
CREDENTIALS_FILE="/opt/meshcentral/meshcentral-data/sync-env.sh"

if [ -f "$CREDENTIALS_FILE" ]; then
  # shellcheck disable=SC1091
  source "$CREDENTIALS_FILE"
fi

SUPABASE_URL="${SUPABASE_URL:-https://kqwaibgvmzcqeoctukoy.supabase.co}"
UPSERT_URL="$SUPABASE_URL/rest/v1/android_devices?on_conflict=device_id,owner"
SYNC_JWT="${SYNC_DEVICES_JWT:-${SYNC_JWT:-}}"   # JWT especial para sync, se definido
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_ROLE:-}}"
ANON_KEY="${SUPABASE_ANON_KEY:-${ANON_KEY:-}}"

if ! command -v jq >/dev/null 2>&1; then
  echo "[sync-devices] ERRO: jq não está instalado." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[sync-devices] ERRO: curl não está instalado." >&2
  exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
  echo "[sync-devices] ERRO: SUPABASE_URL não definido." >&2
  exit 1
fi

if [ ! -f "$CONF_JSON" ]; then
  echo "[sync-devices] ERRO: Ficheiro android-users.json não encontrado em $CONF_JSON" >&2
  exit 1
fi

auth_bearer="${SYNC_JWT:-}"
api_key="${ANON_KEY:-}"

if [ -z "$auth_bearer" ] && [ -n "$SERVICE_ROLE_KEY" ]; then
  auth_bearer="$SERVICE_ROLE_KEY"
  api_key="${api_key:-$SERVICE_ROLE_KEY}"
fi

if [ -z "$auth_bearer" ]; then
  echo "[sync-devices] ERRO: Defina SYNC_DEVICES_JWT ou SUPABASE_SERVICE_ROLE_KEY para autenticação." >&2
  exit 1
fi

if [ -z "$api_key" ]; then
  # Fall back to bearer for apikey if none was provided
  api_key="$auth_bearer"
fi

echo "[sync-devices] Base dir: $BASE_DIR"
echo "[sync-devices] Upsert URL: $UPSERT_URL"

jq -c '.users[]' "$CONF_JSON" | while read -r USER; do
  meshUser=$(echo "$USER" | jq -r '.meshUser // empty')
  folderName=$(echo "$USER" | jq -r '.folderName // empty')

  if [ -z "$meshUser" ] || [ -z "$folderName" ]; then
    echo "[sync-devices] Ignorar entrada sem meshUser/folderName."
    continue
  fi

  USER_DIR="$BASE_DIR/$folderName"
  DEVICES_JSON="$USER_DIR/devices.json"

  echo "[sync-devices] Utilizador $meshUser → dir $USER_DIR"

  if [ ! -f "$DEVICES_JSON" ]; then
    echo "  [sync-devices] Sem devices.json, a ignorar."
    continue
  fi

  devicesFound=$(jq '.devices | length' "$DEVICES_JSON")
  if [ "$devicesFound" -eq 0 ]; then
    echo "  [sync-devices] devices.json sem devices, a ignorar."
    continue
  fi

  jq -c '.devices[]' "$DEVICES_JSON" | while read -r DEV; do
    deviceId=$(echo "$DEV" | jq -r '.device_id // empty')
    notes=$(echo "$DEV" | jq -r '.notes // empty')

    if [ -z "$deviceId" ]; then
      echo "  [sync-devices] Ignorar device sem device_id."
      continue
    fi

    payload=$(jq -n --arg did "$deviceId" --arg owner "$meshUser" --arg notes "$notes" '{ device_id: $did, owner: $owner, notes: ($notes // null) }')

    echo "  [sync-devices] Sync device_id=$deviceId owner=$meshUser notes=\"$notes\""

    if ! curl -sS --fail-with-body "$UPSERT_URL" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $auth_bearer" \
      -H "apikey: $api_key" \
      -H "Prefer: resolution=merge-duplicates,return=representation" \
      -d "$payload" >/dev/null; then
      echo "    [sync-devices] Aviso: falha ao registar device $deviceId" >&2
    fi
  done
done
