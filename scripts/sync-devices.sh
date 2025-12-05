#!/usr/bin/env bash
#
# Sincroniza devices.json do MeshCentral -> Supabase (android_devices)
#
# Regras SoT:
# - Ler android-users.json para descobrir pastas e nomes meshUser.
# - Chamar a Edge Function register-device (service role ou JWT de sync).
# - Idempotente: pode correr em cron sem duplicar registos.

set -euo pipefail

CONFIG_PATH="${CONFIG_PATH:-/opt/meshcentral/meshcentral-data/android-users.json}"
CREDENTIALS_FILE="${CREDENTIALS_FILE:-/opt/meshcentral/meshcentral-data/sync-env.sh}"

if [ -f "$CREDENTIALS_FILE" ]; then
  # shellcheck disable=SC1091
  source "$CREDENTIALS_FILE"
fi

SUPABASE_URL="${SUPABASE_URL:-https://kqwaibgvmzcqeoctukoy.supabase.co}"
REGISTER_URL="${REGISTER_URL:-$SUPABASE_URL/functions/v1/register-device}"

AUTH_BEARER="${SYNC_DEVICES_JWT:-${SYNC_JWT:-${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_ROLE:-}}}}"
API_KEY="${SUPABASE_ANON_KEY:-${ANON_KEY:-}}"

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

if [ -z "$AUTH_BEARER" ]; then
  echo "[sync-devices] ERRO: Defina SYNC_DEVICES_JWT ou SUPABASE_SERVICE_ROLE_KEY para autenticação." >&2
  exit 1
fi

if [ -z "$API_KEY" ]; then
  API_KEY="$AUTH_BEARER"
fi

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[sync-devices] ERRO: Ficheiro android-users.json não encontrado em $CONFIG_PATH" >&2
  exit 1
fi

MESH_FILES_ROOT=$(jq -r '.meshFilesRoot // "/opt/meshcentral/meshcentral-files"' "$CONFIG_PATH")
ROOT_FOLDER=$(jq -r '.rootFolder // "ANDROID"' "$CONFIG_PATH")
BASE_DIR="${MESH_FILES_ROOT%/}/${ROOT_FOLDER:+/$ROOT_FOLDER}"

echo "[sync-devices] Base dir: $BASE_DIR"
echo "[sync-devices] register-device: $REGISTER_URL"

jq -c '.users[]' "$CONFIG_PATH" | while read -r USER; do
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

  devices_json_content=$(jq -c '.devices[]?' "$DEVICES_JSON")
  if [ -z "$devices_json_content" ]; then
    echo "  [sync-devices] devices.json sem devices, a ignorar."
    continue
  fi

  echo "$devices_json_content" | while read -r DEV; do
    deviceId=$(echo "$DEV" | jq -r '.device_id // empty')
    friendlyName=$(echo "$DEV" | jq -r '.friendly_name // .device_name // .name // empty')
    lastSeen=$(echo "$DEV" | jq -r '.last_seen // .last_seen_at // .lastseen // empty')

    if [ -z "$deviceId" ]; then
      echo "  [sync-devices] Ignorar device sem device_id."
      continue
    fi

    payload=$(jq -n \
      --arg did "$deviceId" \
      --arg mesh "$meshUser" \
      --arg fn "$friendlyName" \
      --arg ls "$lastSeen" \
      '{
        device_id: $did,
        mesh_username: $mesh,
        friendly_name: ($fn | select(length > 0)),
        last_seen: ($ls | select(length > 0))
      }')

    echo "  [sync-devices] Sync device_id=$deviceId mesh_username=$meshUser"

  if ! curl -sS --fail-with-body "$REGISTER_URL" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_BEARER" \
      -H "apikey: $API_KEY" \
      -d "$payload" >/dev/null; then
      echo "    [sync-devices] Aviso: falha ao registar device $deviceId" >&2
    fi
  done
done
