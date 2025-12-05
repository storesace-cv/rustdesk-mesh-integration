# ROADMAP — RustDesk ↔ MeshCentral ↔ Supabase

Este ficheiro serve de guia para o Codex / Softgen.ai continuar o trabalho.

---

## 1. Estado actual (baseline)

### 1.1 Frontend (Next.js)

- App Next.js (App Router) com:
  - `/` – página de login:
    - Chama Edge Function `login` em `functions/v1/login`.
    - Usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
    - Guarda o `token` JWT em `localStorage` (`rustdesk_jwt`).
  - `/dashboard` – página principal:
    - Lê o `rustdesk_jwt` do `localStorage`.
    - Gera QR-Code com:
      - host: `rustdesk.bwb.pt`
      - key: `Rs16v4T5zElCIsxbcAn39LwRYniVi5EQbXAgLVqWFYk=`
    - Chama `functions/v1/get-devices` com:
      - `Authorization: Bearer <jwt do utilizador>`
      - `apikey: <anon key>`
    - Agrupa dispositivos em:
      - `"Dispositivos por Adotar"` – quando `notes` está vazio.
      - `<Grupo>` – quando `notes` = `"Grupo | ..."`
      - `<Grupo>` + `<SubGrupo>` – quando `notes` = `"Grupo | SubGrupo | ..."`
    - UI:
      - Grupos e subgrupos colapsáveis.
      - Cards por dispositivo com `device_id`, `owner` e `notes`.
  - O `tsconfig.json` exclui `supabase/functions` para evitar que o type-check do Next.js interprete código Deno das Edge Functions e falhe a build.

### 1.2 Supabase (estrutura esperada)

Tabelas (em `public`):

- `mesh_users`
- `android_devices`
- `android_devices_expanded` (view materializada / view normal — a decidir)

Edge Functions previstas:

- `login` – autentica e devolve JWT de sessão.
- `get-devices` – devolve dispositivos do utilizador autenticado.
- `register-device` – regista/actualiza device (device_id, owner, notes).
- `remove-device` – faz soft-delete ou remove device.

**Nota:** a configuração exacta (colunas, constraints, RLS) deve ser revista com base
no estado actual do projecto no painel Supabase. O SQL deste repositório é um *baseline*.

### 1.3 MeshCentral

- No droplet, existe:
  - `/opt/meshcentral/meshcentral-data/android-users.json`
  - `/opt/meshcentral/meshcentral-files/ANDROID/<User>/devices.json`
- Foi criado:
  - `/opt/meshcentral/sync-devices.sh` (script bash),
  - Serviço `mesh-android-qr-http.service` (já não será necessário depois de migrar para o Next.js).

O comportamento actual (observado pelos logs):

- `android-folders.js` cria estrutura de pastas ANDROID/Admin, ANDROID/Jorge, etc.
- `sync-devices.sh` percorre `android-users.json` e vai lendo `devices.json` de cada pasta.
- Se o `devices.json` não tiver `device_id`, o script ignora.

---

## 2. Tarefas para o Codex

### 2.1 Sincronização MeshCentral → Supabase (script `sync-devices.sh`)

Objectivo: tornar o script 100% funcional e idempotente.

- [x] Abrir `scripts/sync-devices.sh` e implementar a leitura de ficheiros:
  - Ler `android-users.json` a partir de `/opt/meshcentral/meshcentral-data`.
  - Para cada utilizador:
    - Ler `devices.json` em `/opt/meshcentral/meshcentral-files/ANDROID/<folderName>/devices.json`.
    - Cada `device` deve ter pelo menos:
      - `device_id`
      - (idealmente) campos adicionais que o RustDesk fornece.
  - Para cada device com `device_id`:
    - chamar `register-device` (Edge Function) ou fazer `INSERT ... ON CONFLICT ...` directo na tabela `android_devices`.

- [x] Resolver autenticação para o script:
  - Escolher uma destas opções:
    - (A) Usar `service_role` nas chamadas internas (cuidado com segurança).
    - (B) Criar um JWT específico para sync (`sync_devices_jwt`) com claims bem definidas.
  - Guardar as credenciais em `/opt/meshcentral/meshcentral-data/sync-env.sh` (por exemplo) e fazer `source` no início do script.

- [x] Garantir execução segura e idempotente:
  - O script é idempotente (pode correr de X em X minutos).
  - Faz `upsert` (não duplica dispositivos).
  - Preenche pelo menos:
    - `device_id`
    - `owner` (ligado ao mesh_user correspondente)
    - `notes` (pode vir vazio → “Dispositivo por Adotar”).

### 2.2 Edge Functions

Rever e finalizar as funções em:

- `supabase/functions/login/index.ts`
- `supabase/functions/get-devices/index.ts`
- `supabase/functions/register-device/index.ts`
- `supabase/functions/remove-device/index.ts`

Checklist:

- [x] **login**
  - Deve funcionar com apenas:
    - `Authorization: Bearer <anon key>`
    - body: `{ "email": "...", "password": "..." }`
  - Usar `Deno.env.get("SUPABASE_URL")` e `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`.
  - Estado actual: função ajustada para usar `SUPABASE_SERVICE_ROLE_KEY` e devolver `{ "token": "<access_token>" }` seguindo o SoT.

- [x] **get-devices**
  - Validar JWT (enviado pelo frontend como `Authorization: Bearer <session_jwt>`).
  - Extrair `sub` (user id supabase) e mapear para `mesh_users`.
  - Devolver lista de `android_devices` do owner.

- [x] **register-device**
  - Autenticação:
    - ou via JWT (se for chamado pelo frontend),
    - ou via `service_role` (se for chamado apenas por scripts internos).
  - Actuar sobre a tabela `android_devices`:
    - `INSERT ... ON CONFLICT (device_id, owner) DO UPDATE`
    - Manter `notes` e timestamps.

- [x] **remove-device**
  - Implementada como soft-delete, limpando `owner`, `notes`, `mesh_username` e `friendly_name`, e marcando `deleted_at`.
  - Apenas o owner autenticado remove; `service_role` pode remover dispositivos sem filtrar por owner.

### 2.3 Frontend

- [x] Login:
  - Confirmar se o fluxo actual é o desejado:
    - Se já existir `rustdesk_jwt`, saltar login.
    - Caso o token expire, forçar novo login.
  - Melhorar mensagens de erro com base no `error.message` vindo da função `login`.

- [x] Dashboard:
  - Garante que:
    - Em ambiente de erro (Edge Function down, etc.), o dashboard continua a abrir.
    - Se `devices` vier `[]`, mostrar:
      - “Sem dispositivos adoptados (ainda)” em vez de stack trace.

- [ ] Adopção / edição de `notes` (TODO):
  - Adicionar:
    - Botão “Editar” em cada card.
    - Modal simples para alterar o campo `notes`.
  - Enviar os dados para `register-device` de forma a actualizar o registo.

### 2.4 Organização de grupos e subgrupos

A regra acordada:

- `notes = "Grupo | Comentário"` → Grupo simples.
- `notes = "Grupo | SubGrupo | Comentário"` → Grupo + SubGrupo.
- `notes = ""` ou `NULL` → grupo especial `"Dispositivos por Adotar"`.

Tarefas:

- [ ] Garantir que esta regra é:
  - Documentada no README principal (frontend).
  - Validada no backend (por exemplo, separar em colunas calculadas em `android_devices_expanded`).

---

## 3. Automação de deploy e Supabase

### 3.1 update_from_github.sh (local / droplet)

- [ ] Objectivo: tornar `my-rustdesk-mesh-integration` uma cópia exacta de `origin/main`.
- [ ] Comportamento: `git fetch --prune`, checkout/criação do branch, `git reset --hard origin/main` seguido de `git clean -fd`.
- [ ] Salvaguardas: falha se existirem alterações não commitadas (usar `ALLOW_DIRTY_RESET=1` para forçar).
- [ ] Uso: corre na raiz do repositório; não faz push.

### 3.2 update_supabase.sh (local)

- [ ] Fonte única para operações Supabase (migrations, seeds, deploy de Edge Functions).
- [ ] Requer: `SUPABASE_PROJECT_REF`, Supabase CLI autenticado e `supabase/config.toml` ligado ao projecto (pode inferir `SUPABASE_PROJECT_REF` a partir de `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` no `.env.local`).
- [ ] Gera logs em `logs/supabase/supabase-update-<timestamp>.log`.
- [ ] Falha se a CLI não estiver instalada ou se o projecto não estiver linkado.

Estado em 2025-12-05: `supabase/config.toml` passou a estar versionado com `project_id = kqwaibgvmzcqeoctukoy`; continua a ser obrigatório correr `supabase link --project-ref kqwaibgvmzcqeoctukoy` com credenciais válidas antes de `supabase db push`/`functions deploy`.
Estado em 2025-12-06: `supabase/config.toml` foi limpo de chaves antigas (`realtime.port`, `storage.s3`, `kong`) para alinhar com o schema suportado pela CLI v2.65+ e permitir `supabase link` sem erros de parsing.
Estado em 2025-12-07: `scripts/update_to_droplet.sh` passou a clonar o repositório remoto automaticamente quando `REMOTE_DIR` não contém `.git`, evitando falhas de deploy por falta do repo em `/opt/rustdesk-frontend`.
Estado em 2025-12-05: `start.sh` adicionado na raiz do repositório para servir de `ExecStart` do serviço `rustdesk-frontend.service`, carregando variáveis opcionais de `.env.production`/`.env.local` e validando a existência de `.next` antes de executar `next start`.

### 3.3 update_to_droplet.sh (local)

- [ ] Fluxo completo de deploy para `root@142.93.106.94:/opt/rustdesk-frontend`.
- [ ] Passos principais:
  1. Verifica se o branch activo é `my-rustdesk-mesh-integration` e se o working tree está limpo (`SKIP_DIRTY_CHECK=1` para ignorar).
  2. Chama `scripts/update_supabase.sh` antes de qualquer deploy (`SKIP_SUPABASE=1` para ignorar se não houver alterações de schema).
  3. Executa `git push origin my-rustdesk-mesh-integration`.
  4. SSH para o droplet: `git fetch --prune`, `git reset --hard origin/my-rustdesk-mesh-integration`, `npm ci`, `npm run build`, `systemctl restart rustdesk-frontend.service`, `curl -I http://127.0.0.1:3000`.
  5. Cria log remoto em `/root/install-debug-<timestamp>.log` e copia para `logs/deploy/`.
- [ ] Log local do deploy: `logs/deploy/deploy-<timestamp>.log`.
- [ ] Estado em 2025-12-05: tentativa de deploy abortada porque `SUPABASE_PROJECT_REF` não estava definido quando `update_to_droplet.sh` chamou `scripts/update_supabase.sh`. Actualização: o script agora carrega `.env.local` automaticamente **e** tenta derivar `SUPABASE_PROJECT_REF` de `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` antes de falhar.

### 3.4 Registo de logs

- [ ] `logs/supabase/`: actualizações de Supabase.
- [ ] `logs/deploy/`: logs locais do deploy e cópias dos logs remotos do droplet.

---

## 4. Pontos sensíveis / a rever

- Gestão de chaves:
  - **Nunca** commitar `service_role`.
  - Usar apenas `anon` no frontend.
- JWTs:
  - Clarificar se as Edge Functions validam:
    - JWT de contexto (automático Supabase),
    - ou JWT manual passado pelo frontend.
- RLS:
  - Confirmar que `android_devices` e `mesh_users` estão protegidas:
    - Cada utilizador só vê os seus devices.

---

Este ROADMAP deve ser actualizado pelo Codex após cada alteração relevante
no esquema da base de dados, nas Edge Functions ou no frontend.
