# Sync Engine — Hybrid Model Rules

## 1. Objectivo

Definir como os três mundos se mantêm sincronizados:

- MeshCentral (filesystem) — eventos de devices Android.
- Supabase — catálogo canónico de devices e donos.
- Next.js — UI consumidora do catálogo.

## 2. Identificadores Canónicos

- **Device:** `android_devices.device_id` (string RustDesk, ex. `"1403938023"`).
- **Utilizador:** `auth.users.id` (UUID).
- **Mesh User:** `mesh_users.mesh_username` (string).

## 3. Ciclo de Vida de um Device

### 3.1 Criação (descoberta)

1. RustDesk Android é configurado (via QR ou manual).
2. RustDesk / integração gera `devices.json` na pasta do utilizador do Mesh:
   - `ANDROID/<FolderName>/devices.json`
3. `sync-devices.sh` corre (cron ou manual):
   - Lê `devices.json`.
   - Para cada `device` com `device_id`:
     - Descobre `mesh_username` a partir de `android-users.json`.
     - Chama `/register-device` com os dados.

4. `/register-device`:

   - Resolve `mesh_username` → `mesh_users.id` → `auth.users.id`.
   - Upsert em `android_devices`:

     - Se novo:
       - `owner = auth.users.id`
       - `mesh_username = mesh_username`
       - `friendly_name` = do payload (se existir)
       - `notes` inicialmente `null`
       - `group_name` / `subgroup_name` = `null`
       - `adopted_at` = `null`
       - `last_seen_at` = `payload.last_seen` ou `now()`

     - Se existente:
       - Actualiza `owner` se tiver mudado de Mesh user.
       - Actualiza `friendly_name` se vier no payload.
       - Actualiza `last_seen_at`.

5. Resultado:
   - Device passa a aparecer como “Por adoptar” no frontend
     do utilizador dono (ver `is_adopted` em `android_devices_expanded`).

### 3.2 Adopção

1. Utilizador vê o device em “Dispositivos por adoptar”.
2. Clica no card → abre modal para preencher `notes`.
3. Frontend envia `notes` para Edge Function (futura) `/adopt-device` ou
   simplifica usando o SDK Supabase client-side (respeitando RLS).

4. Backend:
   - Garante que `owner = auth.uid()`.
   - Escreve `notes`.
   - Recalcula `group_name` / `subgroup_name` com base em `notes`.
   - Define `adopted_at` = `now()` se ainda estiver null.

5. No próximo `/get-devices`, o device aparece sob o grupo correcto
   (ex.: `Pizza Hut` → `Loja 1`).

### 3.3 Reorganização (editar grupo / notas)

- Quando `notes` é actualizado pelo utilizador:

  1. Backend volta a aplicar a lógica de parsing de grupo/subgrupo.
  2. `group_name` / `subgroup_name` são actualizados.
  3. Device aparece noutro grupo/subgrupo na próxima leitura.

Não há necessidade de tocar no Mesh ou `devices.json` neste momento; a
organização é puramente lógica no Supabase.

### 3.4 Desassociação / Arquivo (futuro)

Quando um device deixar de ser utilizado:

- Backend deve permitir marcar como “arquivado”, por exemplo:
  - `owner = null`
  - `notes = null`
  - `group_name = null`
  - `subgroup_name = null`
  - `archived_at = now()` (campo futuro).

O SoT apenas define o conceito; implementação cabe ao Codex.

## 4. Conflitos e Regras de Prioridade

### 4.1 Conflito de owner

Se o `sync-devices.sh` correr e um `device_id` já existir com um `owner`
diferente daquele deduzido de `mesh_username`:

- Regra SoT:
  - Supabase é master, mas o Mesh é sinal de “evento suspeito”.
- Recomendação:
  - Não alterar automaticamente o `owner` se ele já estiver definido e
    adoptado (`is_adopted = true`).
  - Instead, registar um log ou criar um campo `last_mesh_username`.

Para simplificar, numa primeira fase, o Codex pode:

- Só actualizar `owner` se actualmente for `null` (por adoptar).

### 4.2 Conflito de notes / grupos

- `notes` nunca é vindo do Mesh; é sempre do utilizador via frontend.
- Portanto, não há conflitos directos Mesh ↔ Supabase neste campo.

### 4.3 Dispositivo apagado em Mesh, ainda presente no Supabase

Se o ficheiro `devices.json` deixar de conter um `device_id` que existe no
Supabase:

- A decisão de arquivar ou não é **do SoT Supabase**, não do Mesh.
- O sync **não apaga** devices automaticamente.
- Recomenda-se um job futuro que marque como “stale” os devices sem
  `last_seen_at` recente (ex.: > 90 dias).

## 5. Agendamento do Sync

Sugestão de cron no Mesh:

```cron
*/5 * * * * root /opt/meshcentral/sync-devices.sh >> /var/log/mesh-sync-devices.log 2>&1
```

Requisitos:

- Script deve ser tolerante a falhas de rede.
- Deve fazer backoff mínimo ou abortar em caso de erros repetidos de auth
  (por exemplo, `401 Invalid JWT` sugere que a chave ou token está errado).

## 6. Migrações e Retrocompatibilidade

Sempre que o SoT mudar:

- O `roadmap.md` deve ser actualizado com:
  - “SoT version X → X+1”
  - Scripts/migrações necessárias.
- Codex deve:
  - Criar migrations SQL dentro do repo.
  - Actualizar Edge Functions para respeitar novos campos ou regras.
