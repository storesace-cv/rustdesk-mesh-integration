# RustDesk · Mesh Integration — ROADMAP

Este repositório concentra a integração entre:

- RustDesk (HBBS/HBBr)
- MeshCentral
- Supabase (auth + tabelas android_*)
- Frontend Next.js (rustdesk.bwb.pt:3000)

## Estado atual

- [x] Projeto Next.js 16 com App Router e Tailwind.
- [x] Página de login (`/`) que:
  - chama a Edge Function `login` em Supabase (`/functions/v1/login`);
  - guarda o `access_token` em `localStorage` (`rustdesk_token`);
  - redireciona para `/dashboard` em caso de sucesso.
- [x] Página `/dashboard` placeholder:
  - verifica se existe `rustdesk_token`, caso contrário volta a `/`;
  - mostra o token e um botão "Terminar sessão".
- [x] Scripts de sincronização (a criar em `scripts/`):
  - `update_to_droplet.sh`: sincroniza este repo local → droplet.
  - `update_from_github.sh`: actualiza código no droplet a partir do GitHub.

## Próximos passos (para o Codex / desenvolvimento futuro)

1. **Frontend Dashboard "a sério"**
   - Mostrar QR-Code RustDesk gerado a partir de:
     - host: `rustdesk.bwb.pt`
     - public key HBBS real (já existente no droplet)
   - Ir buscar dispositivos ao Supabase via Edge Function `get-devices`.
   - Implementar:
     - conceito de "Dispositivo por adoptar" (sem `notes`);
     - "grupos" e "subgrupos" com base em `notes`:
       - `Pizza Hut | ...` → grupo `Pizza Hut`;
       - `Pizza Hut | Loja 1 | ...` → grupo `Pizza Hut`, sub-grupo `Loja 1`.
   - UI:
     - secção fixa para o QR;
     - abaixo, lista de grupos e subgrupos com cards dos devices;
     - cards clicáveis para, no futuro, abrir RustDesk.

2. **Fluxo de adopção de dispositivos**
   - Edge Function `register-device`:
     - cria/actualiza `android_devices` com `owner`, `device_id`, `notes`.
   - Regra:
     - se `notes` vazio → fica no grupo **"Dispositivos por adoptar"**;
     - se preenchido → vai para o grupo/subgrupo correspondente.
   - Permitir editar `notes` a partir do frontend (mudar de grupo/loja).

3. **Sincronização MeshCentral → Supabase**
   - Script no droplet (`/opt/meshcentral/sync-devices.sh`) já lista pastas:
     - `/opt/meshcentral/meshcentral-files/ANDROID/<User>/devices.json`
   - Codex deve:
     - alinhar o formato de `devices.json`;
     - enviar os dados para Supabase (`android_devices`) chamando a função HTTP apropriada ou usando client Postgres.

4. **Documentação adicional**
   - Criar em `docs/`:
     - `SETUP_LOCAL.md` — como correr localmente (Node, `.env.local`, etc.).
     - `DEPLOY_DROPLET.md` — como instalar/actualizar no droplet (systemd, build, etc.).
   - Garantir que todas as Edge Functions têm o código-fonte espelhado aqui em `supabase/functions/*`.

## Notas de ambiente

- Variáveis obrigatórias no frontend (`.env.local`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Edge Functions Supabase:
  - `login` (já funcional em produção).
  - `get-devices`, `get-qr`, `register-device`, `remove-device` — a evoluir.

