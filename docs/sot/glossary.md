# Glossary

- **RustDesk** — Software de remote desktop usado nos Androids e PCs.
- **HBBS / HBBR** — Componentes servidor do RustDesk (broker / relay).
- **MeshCentral** — Plataforma de gestão de dispositivos e acesso remoto
  em `mesh.bwb.pt`.
- **Supabase** — Backend como serviço (Postgres + Auth + Edge Functions).
- **Edge Function** — Função serverless em Supabase, invocada via HTTP.
- **Android Device** — Dispositivo Android com RustDesk instalado e
  registado via QR.
- **Device ID (RustDesk)** — Identificador único do cliente RustDesk,
  usado como `device_id` na base de dados.
- **Dispositivo por adoptar** — Device que ainda não tem `notes` válidos
  e/ou `owner` definido.
- **Grupo / Subgrupo** — Organização lógica dos devices, definida via
  campo `notes` usando separador `" | "`.
- **SoT (Source of Truth)** — Conjunto de documentos (este bundle) que
  define como o sistema *deve* funcionar, independentemente do estado
  temporário do código ou da base de dados.
