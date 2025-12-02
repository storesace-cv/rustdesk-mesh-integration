# Data Models — Tabelas, Views, Campos

## 1. Supabase Schema — public.mesh_users

Tabela que liga **utilizador Supabase (auth.users)** ↔ **username do Mesh**.

```sql
create table if not exists public.mesh_users (
  id uuid primary key references auth.users (id) on delete cascade,
  mesh_username text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);
```

### 1.1 Semântica dos campos

- `id`  
  - FK → `auth.users.id`.
  - Este é o **identificador canónico** do utilizador no SoT.
  - Nunca é alterado manualmente.

- `mesh_username`  
  - Username usado no MeshCentral (ex.: `admin`, `rui.abreu`).  
  - Único, case-sensitive (seguir a realidade do Mesh).  
  - Usado nos scripts do Mesh para mapear pasta → utilizador Supabase.

- `display_name`  
  - Nome humanamente legível (ex.: `"Admin"`, `"Rui Abreu"`).

- `created_at`  
  - Data de criação do registo na tabela.

### 1.2 Regras

- Cada utilizador Supabase **deve** ter no máximo um registo em `mesh_users`.
- Cada `mesh_username` só pode mapear para **um** utilizador.
- Se um utilizador for apagado em `auth.users`, o registo em `mesh_users`
  é removido automaticamente (cascade).

---

## 2. Supabase Schema — public.android_devices

Tabela principal de dispositivos Android.

```sql
create table if not exists public.android_devices (
  id uuid primary key default gen_random_uuid(),

  -- Identificador RustDesk (string numérica ou alfanumérica)
  device_id text not null unique,

  -- FK para auth.users.id (dono actual)
  owner uuid references auth.users (id) on delete set null,

  -- Opcional: username Mesh que originou o evento (para debug)
  mesh_username text,

  -- Nome amigável do dispositivo (ex.: "Samsung S23 do Jorge")
  friendly_name text,

  -- Notas com semântica especial para grupos/subgrupos
  -- Ex.: "Pizza Hut | Loja 1 | Smartphone Balcão"
  notes text,

  -- Informação de grupo/subgrupo derivada de notes (para queries rápidas)
  group_name text,
  subgroup_name text,

  -- Estado
  adopted_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Trigger de `updated_at` (conceito SoT, cabe ao Codex criar):

```sql
create or replace function public.set_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger android_devices_set_updated_at
before update on public.android_devices
for each row execute procedure public.set_timestamp_updated_at();
```

### 2.1 Semântica — `notes`, `group_name`, `subgroup_name`

O campo `notes` pode conter:

- Apenas grupo:
  - `"Pizza Hut | Samsung S23 Balcão"`  
    → `group_name = 'Pizza Hut'`, `subgroup_name = null`, descrição livre.

- Grupo + Subgrupo:
  - `"Pizza Hut | Loja 1 | Samsung S23 Balcão"`  
    → `group_name = 'Pizza Hut'`, `subgroup_name = 'Loja 1'`.

Parse canónico:

1. Split por `"|"`.
2. Trim de espaços extra.
3. Regras:
   - Se `partes.length == 1`:
     - `group_name = partes[0]`
   - Se `partes.length >= 2`:
     - `group_name = partes[0]`
     - `subgroup_name = partes[1]`

O texto restante depois de `group_name` e `subgroup_name` continua em `notes`
como texto completo para o utilizador.

### 2.2 Estados de adopção

- **Por adoptar**:
  - `owner` é **null** OU
  - `notes` é null/empty.

- **Adoptado**:
  - `owner` não é null
  - `notes` não é null/empty.

O frontend nunca mostra “adoptado / por adoptar” como flag binária, mas
usa estas regras para decidir em que secção o dispositivo aparece.

---

## 3. View — public.android_devices_expanded

View de conveniência para o frontend.

Regras conceptuais (o SQL exacto pode ser afinado pelo Codex):

- Junta `android_devices` com `mesh_users` e `auth.users`.
- Calcula uma coluna booleana `is_adopted` baseada nas regras anteriores.
- Ordena por `group_name`, `subgroup_name`, `friendly_name`.

Exemplo de definição conceptual:

```sql
create or replace view public.android_devices_expanded as
select
  d.id,
  d.device_id,
  d.owner,
  au.email as owner_email,
  mu.mesh_username,
  mu.display_name as owner_display_name,
  d.friendly_name,
  d.notes,
  d.group_name,
  d.subgroup_name,
  (d.owner is not null and coalesce(d.notes, '') <> '') as is_adopted,
  d.adopted_at,
  d.last_seen_at,
  d.created_at,
  d.updated_at
from public.android_devices d
left join public.mesh_users mu on mu.id = d.owner
left join auth.users au on au.id = d.owner;
```

---

## 4. MeshCentral Filesystem — android-users.json

Ficheiro no servidor Mesh que define mapeamento de utilizadores e pastas:

`/opt/meshcentral/meshcentral-data/android-users.json`

```jsonc
{
  "meshFilesRoot": "/opt/meshcentral/meshcentral-files",
  "rootFolder": "ANDROID",
  "users": [
    {
      "meshUser": "admin",
      "folderName": "Admin",
      "httpUser": "admin",
      "httpPass": "Admin123!"
    },
    {
      "meshUser": "jorge.peixinho@storesace.cv",
      "folderName": "Jorge",
      "httpUser": "jorge",
      "httpPass": "jorge-qr-123"
    },
    {
      "meshUser": "rui.abreu",
      "folderName": "Rui",
      "httpUser": "rui",
      "httpPass": "rui-qr-123"
    },
    {
      "meshUser": "zs.angola",
      "folderName": "zsangola",
      "httpUser": "zsangola",
      "httpPass": "zs-qr-123"
    }
  ]
}
```

Campos:

- `meshFilesRoot`  
  - Raiz do filesystem de ficheiros privados do Mesh.

- `rootFolder`  
  - Subpasta base para Android (`ANDROID`).

- `users[]`  
  - `meshUser`  
    - Username exacto do Mesh.
  - `folderName`  
    - Nome da subpasta dentro de `ANDROID/` associada ao utilizador.
  - `httpUser` / `httpPass`  
    - Credenciais básicas usadas pelo *antigo* `qr-http.js` e/ou qualquer
      outro serviço HTTP legado. No novo modelo com Supabase/Next.js, estes
      campos tornam‑se menos importantes, mas são mantidos para compatibilidade.

---

## 5. MeshCentral Filesystem — devices.json

Gerado por RustDesk / integração no Android.

Localização por utilizador Mesh:

`/opt/meshcentral/meshcentral-files/ANDROID/<FolderName>/devices.json`

Formato mínimo obrigatório (SoT):

```jsonc
{
  "folder": "Admin",
  "devices": [
    {
      "device_id": "1403938023",
      "last_seen": "2025-12-01T02:30:00Z",
      "friendly_name": "Smartphone Android do Jorge (teste)"
    }
  ]
}
```

Regras:

- `folder` deve corresponder ao `folderName` em `android-users.json`.
- `devices` é um array; é permitido ter mais do que um device por pasta.
- `device_id` é obrigatório.
- `last_seen` é opcional mas **fortemente recomendado**.  
  Se ausente, o sync script usa `now()` como fallback.
- `friendly_name` é opcional; se ausente, o frontend pode gerar um nome
  genérico (ex.: `"Android #<4 dígitos do device_id>"`).

Caberá ao Codex alinhar o código existente de geração de `devices.json` com
este formato SoT.
