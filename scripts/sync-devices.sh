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

SUPABASE_URL="${SUPABASE_URL:-https://kqwaibgvmzcqeoctukoy.supabase.co}"
EDGE_REGISTER_URL="$SUPABASE_URL/functions/v1/register-device"
SYNC_JWT="${SYNC_JWT:-}"   # JWT especial para sync, a definir
ANON_KEY="${ANON_KEY:-}"   # opcional, se a função exigir também apikey

if ! command -v jq >/dev/null 2>&1; then
  echo "[sync-devices] ERRO: jq não está instalado." >&2
  exit 1
fi

if [ ! -f "$CONF_JSON" ]; then
  echo "[sync-devices] ERRO: Ficheiro android-users.json não encontrado em $CONF_JSON" >&2
  exit 1
fi

echo "[sync-devices] Base dir: $BASE_DIR"

jq -c '.users[]' "$CONF_JSON" | while read -r USER; do
  meshUser=$(echo "$USER" | jq -r '.meshUser')
  folderName=$(echo "$USER" | jq -r '.folderName')

  USER_DIR="$BASE_DIR/$folderName"
  DEVICES_JSON="$USER_DIR/devices.json"

  echo "[sync-devices] Utilizador $meshUser → dir $USER_DIR"

  if [ ! -f "$DEVICES_JSON" ]; then
    echo "  [sync-devices] Sem devices.json, a ignorar."
    continue
  fi

  # Espera-se um formato:
  # {
  #   "folder": "Admin",
  #   "devices": [
  #     { "device_id": "1403938023", "notes": "Grupo | SubGrupo | ..." }
  #   ]
  # }
  devicesFound=$(jq '.devices | length' "$DEVICES_JSON")
  if [ "$devicesFound" -eq 0 ]; then
    echo "  [sync-devices] devices.json sem devices, a ignorar."
    continue
  fi

  jq -c '.devices[]' "$DEVICES_JSON" | while read -r DEV; do
    deviceId=$(echo "$DEV" | jq -r '.device_id // empty')
    notes=$(echo "$DEV" | jq -r '.notes // ""')

    if [ -z "$deviceId" ]; then
      echo "  [sync-devices] Ignorar device sem device_id."
      continue
    fi

    echo "  [sync-devices] Sync device_id=$deviceId owner=$meshUser notes="$notes""

    curl -sS "$EDGE_REGISTER_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SYNC_JWT" \
      -H "apikey: $ANON_KEY" \
      -d "$(jq -n --arg did "$deviceId" --arg owner "$meshUser" --arg notes "$notes" '{ device_id: $did, owner: $owner, notes: $notes }')" \
      || echo "    [sync-devices] Aviso: falha ao registar device $deviceId"
  done
done
