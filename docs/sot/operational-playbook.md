# Operational Playbook

## 1. Rotina de Operação

### 1.1 Adicionar novo técnico

1. Criar utilizador em Supabase (Auth → Users).
2. Obter `auth.users.id` (UUID).
3. Adicionar linha em `public.mesh_users`:
   - `id` = UUID do Supabase
   - `mesh_username` = username do Mesh
   - `display_name` = nome legível.
4. Adicionar entrada em `android-users.json` no Mesh:
   - `meshUser`
   - `folderName`
   - (opcional) `httpUser` / `httpPass` se ainda usados.

### 1.2 Iniciar suporte Android para um técnico

1. Certificar que a pasta do técnico existe em:
   - `/opt/meshcentral/meshcentral-files/ANDROID/<FolderName>`
   - Caso não exista, correr `android-folders.js`.
2. Abrir `https://rustdesk.bwb.pt` e fazer login com o novo utilizador.
3. Verificar que o QR é gerado.
4. No Android do técnico:
   - Instalar RustDesk.
   - Ler o QR.
5. Confirmar que `devices.json` foi criado/actualizado.
6. Correr `/opt/meshcentral/sync-devices.sh` manualmente.
7. Confirmar no frontend que o device aparece em “Dispositivos por adoptar”.

## 2. Troubleshooting

### 2.1 QR mostra IP em vez de domínio

- Sintoma:
  - QR criado com `host="142.93.106.94"` em vez de `rustdesk.bwb.pt`.

- Causa provável:
  - Código do frontend está a usar uma fonte errada para a configuração.

- Acção:
  - Verificar `src/app/dashboard/page.tsx`:
    - Deve usar constantes SoT:

      ```ts
      const RUSTDESK_HOST = "rustdesk.bwb.pt";
      const RUSTDESK_KEY  = "Rs16v4T5zElCIsxbcAn39LwRYniVi5EQbXAgLVqWFYk=";
      ```

### 2.2 Não aparece nenhum dispositivo no dashboard

Checklist:

1. Frontend:
   - Falha ao chamar `/get-devices`?  
     Ver DevTools → Network → resposta da função.
2. Supabase:
   - Tabela `android_devices` está vazia?
3. Mesh:
   - `devices.json` existem e têm `device_id`?  
     Ver `/opt/meshcentral/meshcentral-files/ANDROID/*/devices.json`
4. Sync:
   - Correr `/opt/meshcentral/sync-devices.sh` manualmente e observar output.
   - Ver se há erros `401 Invalid JWT` (problema de chave).

### 2.3 Erros 401 Invalid JWT nos scripts

- Causa provável:
  - Header `Authorization` está a usar um token errado (por ex. anon key
    em vez de service_role, ou token expirado).

- Acção:
  - Confirmar que o script usa `service_role` correcto numa variável
    de ambiente (ex.: `SUPABASE_SERVICE_ROLE`).
  - Confirmar que a função está configurada para aceitar esse formato.

## 3. Deploy do Frontend

Resumo (para Codex detalhar em docs de infra):

1. `git pull` na pasta `/opt/rustdesk-frontend`.
2. `npm install` (se necessário).
3. `npm run build`.
4. `systemctl restart rustdesk-frontend.service`.
5. Verificar com:
   - `systemctl status rustdesk-frontend.service`
   - `curl -I http://127.0.0.1:3000`

## 4. Backup & Restore

- SoT recomenda:
  - Backup regular das tabelas Supabase relevantes:
    - `mesh_users`
    - `android_devices`
  - Backup de:
    - `/opt/meshcentral/config.json`
    - `/opt/meshcentral/meshcentral-data/android-users.json`
    - `/opt/meshcentral/meshcentral-files/ANDROID/`

Procedimentos concretos podem ser definidos numa fase seguinte.
