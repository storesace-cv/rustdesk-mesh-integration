# MeshCentral Integration — Filesystem & Scripts

## 1. Estrutura de Pastas

Base:

- `/opt/meshcentral/meshcentral-files/ANDROID/`

Dentro desta pasta, existe uma subpasta por utilizador Mesh, conforme
definido em `android-users.json`:

- `/opt/meshcentral/meshcentral-files/ANDROID/Admin`
- `/opt/meshcentral/meshcentral-files/ANDROID/Jorge`
- `/opt/meshcentral/meshcentral-files/ANDROID/Rui`
- `/opt/meshcentral/meshcentral-files/ANDROID/zsangola`

Dentro de cada pasta de utilizador, esperamos no mínimo:

- `qr.png` — QR code de configuração RustDesk (para Android).
- `rustdesk-config-<user>.txt` — texto `config={"host":...}` para debug.
- `rustdesk-id.txt` / `rustdesk-id.html` — ID/HTML legados do RustDesk.
- `devices.json` — ficheiro SoT de dispositivos Android (ver `data-models.md`).

## 2. Script android-folders.js (legado e futuro)

Local (actual / planeado):

- `/opt/meshcentral/scripts/android-folders.js`

Responsabilidade:

- Ler `android-users.json`.
- Garantir a existência de pastas:
  - `/ANDROID/`
  - `/ANDROID/<FolderName>/`
- Criar um `INFO.txt` por pasta a explicar o uso.
- (Opcionalmente) inicializar `devices.json` com estrutura vazia:

```json
{
  "folder": "Admin",
  "devices": []
}
```

Este script é pensado para ser seguro e idempotente — pode correr várias
vezes sem efeitos adversos.

## 3. Script sync-devices.sh

Local planeado:

- `/opt/meshcentral/sync-devices.sh`

Responsabilidade:

1. Ler `android-users.json` para saber quais pastas existem e a que
   `meshUser` correspondem.
2. Para cada pasta encontrada:
   - Abrir `/ANDROID/<FolderName>/devices.json`.
   - Para cada `device` com `device_id` válido:
     - Chamar Edge Function `/register-device` em Supabase
       com payload que inclui:
       - `device_id`
       - `mesh_username`
       - `friendly_name`
       - `last_seen`
3. Registar no stdout o que foi processado, ignorado e erros.

Pseudo‑código ilustrativo (não é o script final, é SoT):

```bash
#!/usr/bin/env bash
set -euo pipefail

CONFIG="/opt/meshcentral/meshcentral-data/android-users.json"
BASE_DIR=$(jq -r '.meshFilesRoot + "/" + .rootFolder' "$CONFIG")

echo "[sync-devices] Base dir: $BASE_DIR"

jq -c '.users[]' "$CONFIG" | while read -r user; do
  MESH_USER=$(echo "$user" | jq -r '.meshUser')
  FOLDER=$(echo "$user" | jq -r '.folderName')
  DIR="$BASE_DIR/$FOLDER"
  DEV_FILE="$DIR/devices.json"

  echo "[sync-devices] Utilizador $MESH_USER → dir $DIR"

  if [ ! -f "$DEV_FILE" ]; then
    echo "[sync-devices]   Sem devices.json, ignorar."
    continue
  fi

  DEVICES=$(jq -c '.devices[]?' "$DEV_FILE")
  if [ -z "$DEVICES" ]; then
    echo "[sync-devices]   devices.json sem devices, ignorar."
    continue
  fi

  echo "$DEVICES" | while read -r dev; do
    DEVICE_ID=$(echo "$dev" | jq -r '.device_id // empty')
    [ -z "$DEVICE_ID" ] && { echo "[sync-devices]   Ignorar entrada sem device_id"; continue; }

    curl -sS -X POST "https://<PROJECT>.supabase.co/functions/v1/register-device"       -H "Content-Type: application/json"       -H "Authorization: Bearer $SUPABASE_ANON_OR_SERVICE_KEY"       -d "$(jq -n --arg device_id "$DEVICE_ID"                    --arg mesh_user "$MESH_USER"                    --argjson dev "$dev" '
          {
            device_id: $device_id,
            mesh_username: $mesh_user,
            friendly_name: $dev.friendly_name,
            last_seen: $dev.last_seen
          }
        ')"

  done
done
```

Cabe ao Codex:

- Implementar o script real em `scripts/sync-devices.sh` dentro do repo.
- Garantir que as chaves Supabase são abastecidas via variáveis de ambiente
  seguras (não hardcode em ficheiros).
- Produzir documentação no README do script sobre instalação do cron/systemd.

## 4. MeshCentral Config — startup.js e run.startup

O SoT assume que **qualquer código custom** para Android (por exemplo,
geração automática de `qr.png`, criação de `devices.json` inicial, etc.)
deve ser colocado em:

- `/opt/meshcentral/meshcentral-data/domains/startup.js` **ou**
- `/opt/meshcentral/meshcentral-data/startup.js`

E activado na `config.json` do Mesh:

```jsonc
"domains": {
  "": {
    "title": "mesh server",
    "title2": "meshserver",
    "newAccounts": true,
    "certUrl": "https://mesh.bwb.pt",
    "run": {
      "startup": "startup.js"
    }
  }
}
```

O papel do `startup.js` é:

- Corrida no arranque do MeshCentral.
- Configurar event handlers (por ex., logging, automatismos futuros).
- *Não* é obrigatório para o funcionamento mínimo da integração com Supabase,
  mas é o ponto correcto para qualquer automatismo “servidor Mesh” que venha
  a ser criado.

## 5. Logs e Diagnóstico

- Logs de erros MeshCentral:
  - `/opt/meshcentral/meshcentral-data/mesherrors.txt`

- Service:
  - `systemctl status meshcentral`
  - `journalctl -u meshcentral -n 100 --no-pager`

- Para Android scripts:
  - Todos os scripts em `/opt/meshcentral/scripts/*.js` e `.sh` devem:
    - Escrever prefixos claros (ex.: `[android-folders]`,
      `[sync-devices]`) para facilitar grep.
    - Evitar escrever segredos nos logs.
