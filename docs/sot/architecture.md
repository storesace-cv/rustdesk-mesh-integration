# Architecture — RustDesk ⇄ MeshCentral ⇄ Supabase

## 1. Components

### 1.1 RustDesk Server (HBBS / HBBR)

- Host: `rustdesk.bwb.pt`
- Responsibility:
  - Provide rendezvous and relay services for RustDesk clients.
  - Store and validate RustDesk IDs and public keys.
- **Out of scope:** The SoT does not configure HBBS/HBBR internals; it only cares
  that a working RustDesk infrastructure exists and that Android devices can
  connect to it using:
  - `host = rustdesk.bwb.pt`
  - `relay = rustdesk.bwb.pt`
  - `key = Rs16v4T5zElCIsxbcAn39LwRYniVi5EQbXAgLVqWFYk=`

### 1.2 MeshCentral Server

- Hostname: `mesh.bwb.pt`
- Runs on: DigitalOcean droplet (`142.93.106.94`).
- Responsibility:
  - Device management, remote control, inventory for PCs and Androids.
  - User authentication & authorization for technicians and admins.
  - Filesystem used as integration bridge for Android devices:
    - `/opt/meshcentral/meshcentral-files/ANDROID/<FolderName>/`

### 1.3 Supabase Project

- Supabase project URL: `https://kqwaibgvmzcqeoctukoy.supabase.co`
- Responsibility:
  - Central catalogue of Android devices and their ownership.
  - Authentication for the web frontend (Next.js).
  - API (Edge Functions) for the frontend and for Mesh sync scripts.
  - Long‑term storage of adoption metadata (groups, notes, history).

Key schemas of interest:

- `auth.users`  — Supabase auth users.
- `public.mesh_users` — Mapping Mesh username → Supabase user.
- `public.android_devices` — Raw device registry.
- `public.android_devices_expanded` — View with enriched/grouped information.

### 1.4 Next.js Frontend (RustDesk Android Support)

- Deployed on the same droplet at:
  - `http://127.0.0.1:3000` (internal)
  - Exposed via Nginx as `https://rustdesk.bwb.pt`
- Responsibility:
  - Login technicians via Supabase Auth.
  - Show *only their own* Android devices.
  - Show “Devices por adoptar” and provide adoption UI.
  - Generate RustDesk configuration QR code:
    - Always using `rustdesk.bwb.pt` (never a raw IP).
  - In futuro: deep-link / custom URL to auto-abrir RustDesk no PC.

### 1.5 Infraestrutura do droplet (baseline)

- DigitalOcean droplet partilhado por MeshCentral e frontend.
- Recursos mínimos actualmente alocados:
  - 1 GB RAM
  - 10 GB disco
- Sistema operativo: Ubuntu 22.04 LTS.
- Implicações:
  - Evitar builds pesados no servidor (seguir pipeline Step-* com build local).
  - Monitorizar memória ao reiniciar serviços (Next.js + MeshCentral) para prevenir OOM.

## 2. Hybrid Model — Authority Split

The system follows a **hybrid authority** model:

- **Event Source:** MeshCentral filesystem.
  - When RustDesk Android lê o QR, ele grava um `devices.json`
    em `/ANDROID/<FolderName>/devices.json`.
  - That file is treated as the “event” that a device exists.

- **Source of Truth (SoT):** Supabase.
  - All canonical device state lives in `public.android_devices`.
  - Ownership, group/subgrupo, notes, adoption state are mastered here.
  - Any change done manually in the DB must respect the SoT rules below.

In case of conflicting information:

- **Supabase wins** for:
  - Assigned owner (Supabase user / Mesh user mapping).
  - Group and subgroup (parsed from `notes`).
  - Adoption status & notes.

- **MeshCentral wins** for:
  - The existence of a `devices.json` for a given Folder (event that a device reported in).
  - The device_id emitted by RustDesk (it is the primary external identifier).

## 3. High-Level Flow

1. Technician abre `https://rustdesk.bwb.pt`.
2. Faz login via Supabase Auth (`email + password`).
3. Frontend chama Edge Function `/get-devices` com JWT do utilizador.
4. Supabase devolve devices filtrados por `owner = auth.uid()`.
5. Frontend mostra:
   - QR code com config RustDesk para o utilizador (host + relay + key).
   - Lista de dispositivos adoptados, agrupados por Grupo / Subgrupo.
   - “Grupo especial”: **Dispositivos por adoptar** (se existirem).
6. No Android:
   - Utilizador instala RustDesk pré-configurado (APK assinada).
   - Lê QR code `config={"host":...,"relay":...,"key":...}` se necessário.
   - Ao abrir a integração, RustDesk gera / actualiza `devices.json` no Mesh.
7. Cron job no Mesh executa `sync-devices.sh`:
   - Lê todos os `devices.json` da estrutura ANDROID.
   - Chama Edge Function `/register-device` para cada device.
8. Supabase:
   - Upsert em `public.android_devices` (pelo device_id).
   - Se o campo `notes` estiver vazio → marca como “Por adoptar”.
   - Caso contrário, calcula grupo/subgrupo a partir de `notes`.

Assim, qualquer device que aparecer no Mesh será catalogado em Supabase e
irá aparecer no frontend para o utilizador certo, de forma segura.
