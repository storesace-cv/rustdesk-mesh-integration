# RustDesk Mesh Integration

Frontend + backend helper files para integrar:

- MeshCentral
- RustDesk
- Supabase (auth + android_devices)

Este repositório NÃO tem node_modules, apenas o código-fonte, scripts e documentação
para que o Codex / Softgen consiga continuar o desenvolvimento.

## Componentes principais

- `src/app` – Frontend Next.js (login + dashboard com QR e dispositivos).
- `supabase/functions` – Esqueleto das Edge Functions:
  - `login`
  - `get-devices`
  - `register-device`
  - `remove-device`
- `scripts/` – Scripts auxiliares:
  - `sync-devices.sh` – ler devices.json do MeshCentral e enviar para Supabase.
  - `update_from_github.sh` – para correr no droplet.
  - `update_to_droplet.sh` – para correr no Mac.
- `docs/ROADMAP.md` – Tarefas para o Codex.

Ver `docs/ROADMAP.md` para detalhes e tarefas abertas.
