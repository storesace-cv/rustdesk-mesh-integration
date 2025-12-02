# Supabase Integration — Auth, RLS, Edge Functions

## 1. Auth Model

- Auth provider: **Email + Password** (Supabase Auth padrão).
- Utilizadores relevantes (exemplo actual):

  - `suporte@bwb.pt` → perfil `admin`
  - `jorge.peixinho@bwb.pt`
  - `assistencia@zsa-softwares.com`
  - `datalink@datalink.pt`

- `auth.users.id` é o identificador canónico do utilizador no SoT.
- `public.mesh_users.id` referencia `auth.users.id` (1:1).

### 1.1 Perfis / tipos de utilizador (conceito)

Não existe, à data deste SoT, uma tabela de perfis; tudo é tratado com base
no utilizador autenticado. O SoT, porém, recomenda a eventual criação de uma
tabela `user_profiles` caso sejam necessários papéis diferenciados (Admin,
Técnico, Leitura‑apenas, etc.).

## 2. RLS (Row Level Security)

A segurança deve ser reforçada com RLS, em vez de confiar apenas na lógica
das Edge Functions. Regras conceptuais:

### 2.1 android_devices

- Regra: um utilizador só vê dispositivos onde `owner = auth.uid()`.

Exemplo de política conceptual (SoT):

```sql
alter table public.android_devices enable row level security;

create policy "Devices visíveis apenas ao dono"
on public.android_devices
for select
using (owner = auth.uid());

create policy "Utilizador só pode actualizar os seus dispositivos"
on public.android_devices
for update
using (owner = auth.uid())
with check (owner = auth.uid());
```

Políticas adicionais podem ser necessárias para o serviço de sync (que corre
com `service_role`), mas o guardrail principal é:

- Edge Functions que usam `service_role` **devem** implementar verificação
  explícita de autorização antes de ler/escrever dados de outros utilizadores.

## 3. Edge Functions — Contratos

Todas as Edge Functions seguem o mesmo padrão:

- Endpoint: `https://<PROJECT>.supabase.co/functions/v1/<name>`
- Autorização:
  - Chamadas do web frontend:
    - Header `Authorization: Bearer <access_token_do_user>`
  - Chamadas de scripts/cron/infra:
    - Header `Authorization: Bearer <service_role_key>`

### 3.1 /login

Apesar de existir o SDK cliente, o SoT inclui esta função para compatibilidade
com o frontend actual.

**Input (JSON):**

```json
{
  "email": "suporte@bwb.pt",
  "password": "Admin123!"
}
```

**Output (200):**

```json
{
  "token": "<access_token_jwt_do_utilizador>"
}
```

**Erros típicos:**

- 400 — `Email and password required`
- 401 — `Invalid login credentials` (ou mensagem original do Supabase)
- 500 — Erro inesperado (mensagem genérica no body).

### 3.2 /get-qr

Responsável por gerar o JSON necessário para construir o QR de configuração,
sempre com domínio, nunca IP.

**Input:**

- Headers:
  - `Authorization: Bearer <user_access_token>`
- Body: vazio (não é necessário).

**Output (200):**

```json
{
  "config": {
    "host": "rustdesk.bwb.pt",
    "relay": "rustdesk.bwb.pt",
    "key": "Rs16v4T5zElCIsxbcAn39LwRYniVi5EQbXAgLVqWFYk="
  }
}
```

### 3.3 /get-devices

Devolve lista de devices do utilizador autenticado:

**Input:**

- Headers:
  - `Authorization: Bearer <user_access_token>`
- Body: vazio.

**Output (200):**

```json
[
  {
    "id": "uuid-android-device-1",
    "device_id": "1403938023",
    "friendly_name": "Smartphone Android do Jorge (teste)",
    "group_name": "Pessoal",
    "subgroup_name": null,
    "notes": "Pessoal | Smartphone Android do Jorge (teste)",
    "is_adopted": true,
    "last_seen_at": "2025-12-01T02:30:00Z"
  }
]
```

Se não houver devices, deve devolver `[]` e **não** um erro.

### 3.4 /register-device

Chamado pelos scripts do Mesh (`sync-devices.sh`) para registar/actualizar
um device.

**Input:**

- Headers:
  - `Authorization: Bearer <service_role_key>`
- Body:

```json
{
  "device_id": "1403938023",
  "mesh_username": "admin",
  "friendly_name": "Smartphone Android do Jorge (teste)",
  "last_seen": "2025-12-01T02:30:00Z"
}
```

**Semântica:**

1. Validar que existe um `mesh_users` com `mesh_username` recebido.
2. Mapear esse `mesh_users.id` para `owner`.
3. Upsert em `android_devices` usando `device_id` como chave lógica.

Pseudo‑lógica:

- Se `android_devices.device_id` ainda não existe:
  - INSERT com:
    - `device_id`
    - `owner` = id do utilizador encontrado
    - `mesh_username`
    - `friendly_name` (se vier)
    - `last_seen_at` = `last_seen` ou `now()`
- Se já existe:
  - UPDATE:
    - `owner` é actualizado para o novo owner (caso tenha mudado).
    - `friendly_name` é actualizado se vier no payload.
    - `last_seen_at` é actualizado.
    - `mesh_username` mantém histórico actual (pode ser só o último).

### 3.5 /remove-device (para futuro)

Função opcional para desassociar / arquivar devices. O SoT apenas declara
os princípios:

- Input:
  - `device_id`
- Autorização:
  - Utilizador só pode remover dispositivos seus, **ou**
  - Admin com papel apropriado.
- Comportamento recomendado:
  - Não apagar a linha de `android_devices`, mas marcar:
    - `owner = null`
    - `notes = null`
    - `group_name = null`
    - `subgroup_name = null`
    - opcionalmente, `archived_at = now()` (campo futuro).

## 4. Envars (Next.js e scripts)

Para o Next.js e scripts funcionarem de forma consistente, o SoT define:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No lado dos scripts/Edge Functions (não expostos ao browser):

- `SUPABASE_URL` (igual ao anterior)
- `SUPABASE_SERVICE_ROLE`

Em termos de segurança:

- O `anon` key é público (já é, por natureza).
- O `service_role` **nunca** deve ser enviado para o browser nem commited no
  Git, sendo usado apenas em Edge Functions e scripts no servidor.
