# ROADMAP — SoT-Aligned (RustDesk ⇄ MeshCentral ⇄ Supabase)

Este roadmap substitui versões anteriores e é o documento canónico para alinhar o código com o SoT em `docs/sot/**`. Todas as tarefas abaixo referenciam secções do SoT como justificação e indicam dependências e riscos.

## Estado Actual (realidade do repositório)
- **Supabase**: não existem migrações na árvore do repo; o esquema `android_devices`/`mesh_users` e a view `android_devices_expanded` descritos no SoT não estão versionados no código.
- **Edge Functions**: `get-devices` usa `mesh_users.auth_user_id` e espera `owner` como `mesh_username`; `register-device` recebe `owner` directamente e faz upsert por `(device_id, owner)` sem resolver `mesh_username` → `auth.users.id`; não há cálculo de `last_seen_at`, `group_name` ou `subgroup_name`; `remove-device` faz hard delete. Contraria `supabase-integration.md` e `api-contracts.md`.
- **Frontend**: `/dashboard` consome `get-devices` e agrupa por `notes` no cliente; não usa `/get-qr`; não distingue `is_adopted` nem `group_name/subgroup_name` pré-calculados; token é guardado em `localStorage` (SoT recomenda cookie httpOnly).
- **Scripts Mesh**: `scripts/sync-devices.sh` é baseline e envia `{ device_id, owner(mesh_user), notes }` para `/register-device`; não lê `last_seen`/`friendly_name` nem resolve `mesh_username` para Supabase `owner` UUID.
- **Documentação**: `docs/ROADMAP.md` estava desactualizado; não havia planeamento por fases nem apontadores claros para divergências SoT.

## Phase 1 — Stabilization & SoT Alignment
1. **Versionar esquema Supabase (SoT `data-models.md`)**
   - Adicionar migrations SQL para `mesh_users`, `android_devices`, trigger `set_timestamp_updated_at` e view `android_devices_expanded` conforme SoT, garantindo `owner uuid references auth.users(id)` e `device_id unique`.
   - Incluir seeds de referência para mapear `mesh_username` ↔ utilizadores reais (sem segredos).
   - Risco: divergência com estado já existente no projecto Supabase; validar antes de aplicar.
2. **Reescrever Edge Functions para contratos SoT (SoT `api-contracts.md`, `supabase-integration.md`)**
   - `login`: manter contract, melhorar mensagens localizadas e tratamento de erros.
   - `get-devices`: validar JWT via `getUser()`, usar `android_devices_expanded`, filtrar por `owner = auth.uid()`, devolver `is_adopted`, `group_name`, `subgroup_name`, `last_seen_at`.
   - `get-qr`: nova função ou ajustar frontend para consumir constante SoT; sempre devolver domínio `rustdesk.bwb.pt` e key oficial.
   - `register-device`: aceitar `{ device_id, mesh_username, friendly_name?, last_seen? }`, resolver `mesh_username` → `mesh_users.id`, upsert por `device_id` (não `(device_id, owner)`), actualizar `owner`, `friendly_name`, `mesh_username`, `last_seen_at`, respeitando regra de não sobrescrever owner adoptado (SoT `sync-engine.md` §4.1).
   - `remove-device`: mudar para soft-reset (`owner=null`, `notes=null`, grupos null, opcional `archived_at`) em vez de delete.
3. **Script de sync no Mesh (SoT `meshcentral-integration.md` §3)**
   - Actualizar `scripts/sync-devices.sh` para ler `last_seen` e `friendly_name` do `devices.json` SoT, injectar `mesh_username` a partir de `android-users.json` e chamar a nova `/register-device` com service role; registar logs com prefixos.
   - Documentar envars (`SUPABASE_SERVICE_ROLE`, `SUPABASE_URL`) e cron sugerido.
4. **Frontend hardening (SoT `frontend-behaviour.md`)**
   - Centralizar carregamento de QR via `/get-qr` (ou constantes SoT) e garantir domínio nunca é IP.
   - Consumir `android_devices_expanded`: respeitar `is_adopted`, `group_name`, `subgroup_name`, `friendly_name`, `last_seen_at`; grupo especial “Dispositivos por adoptar”.
   - Melhorar experiência de erro (mensagens amigáveis, redireccionamento em 401) e estado de loading.
   - Preparar camada de token para futura migração para cookie httpOnly (wrapper util com fallback `localStorage`).
5. **Segurança e RLS (SoT `security-and-permissions.md`)**
   - Adicionar políticas RLS para `android_devices` (select/update apenas owner) e restringir `mesh_users` a service role.
   - Verificar que Edge Functions com service role fazem validação manual de `mesh_username` e não aceitam payloads anónimos.

## Phase 2 — Completion of Functional Gaps
1. **Fluxo de adopção/edição de notes (SoT `frontend-behaviour.md` §3.4, `sync-engine.md` §3.2)**
   - Criar função `/adopt-device` ou estender `/register-device` para aceitar `notes` do utilizador autenticado, recalcular `group_name/subgroup_name`, definir `adopted_at` se nulo.
   - UI: modal para editar `notes` tanto em devices por adoptar como adoptados; optimizar parsing no backend apenas.
2. **Deepen device metadata**
   - Guardar `last_seen_at` de forma consistente (fallback `now()` quando ausência no `devices.json`), mostrar “ago” no frontend.
   - Adicionar campo opcional `archived_at` para futura remoção lógica (referenciado em Phase 1 remove-device change).
3. **Consistência entre Mesh e Supabase**
   - Implementar salvaguarda para conflito de owner: se `is_adopted=true` e o sync reporta outro `mesh_username`, registar alerta (log/flag) em vez de reassociar automaticamente (SoT `sync-engine.md` §4.1).
4. **Doc Atualizado & Playbook**
   - Alinhar `docs/DEPLOY_DROPLET.md` e `docs/SETUP_LOCAL.md` com novos envars, scripts e passos de deploy das Edge Functions.

## Phase 3 — Deployment, Automation & Hardening
1. **Pipelines e tooling**
   - Adicionar lint/test CI, validação de format e execução de unit tests dos helpers (se aplicável).
   - Scriptar deploy das Edge Functions (CLI Supabase ou scripts `deploy/`), garantindo que o código do repo é a referência.
2. **Observabilidade**
   - Logging consistente em scripts e funções (`[sync-devices]`, `[register-device]`), métricas mínimas (contagem de devices processados, erros por pasta Mesh).
   - Documentar localização de logs no droplet e retenção recomendada.
3. **Segurança operacional**
   - Rotação e storage seguro de `service_role`; evitar exposição em stdout; reforçar instruções de backup (SoT `operational-playbook.md`).
   - Implementar supervisão do serviço Next.js (systemd healthcheck, restart policy) e validar TLS/Nginx config.

## Phase 4 — Optional Improvements / Nice-to-Have
1. **UX extra**
   - Botão “Abrir no RustDesk” com deep-link para desktop (SoT `roadmap.md` Futuro).
   - Layout responsive aprimorado (dois painéis em desktop, cards melhorados) e i18n mínimo (PT/EN).
2. **Automação de stale devices**
   - Job que marca devices sem `last_seen_at` >90 dias como “stale” ou arquivados (SoT `sync-engine.md` §4.3).
3. **Relatórios e auditoria**
   - Dashboards de adopção/uso; histórico de mudanças em `notes` e ownership.
4. **Aplicação móvel / PWA**
   - Cliente leve para técnicos consultarem devices e notas (SoT `roadmap.md` Futuro).

## Riscos & Blocos
- **Dados existentes fora do repo**: o estado real do Supabase pode divergir; migrações devem ser aplicadas com cautela (backup prévio).
- **Chaves e segredos**: necessitam de gestão fora do Git (envars no droplet e Supabase); bloqueio se não houver acesso às credenciais.
- **Compatibilidade Mesh**: alterações no formato `devices.json` exigem coordenação com a geração pelo RustDesk/Android; validar em staging antes de cron.

## Dependências transversais
- Phase 1 é pré-requisito para todas as restantes (garante esquema e contratos correctos).
- Phase 2 adopção depende de Edge Functions refactorizadas e RLS activas (Phase 1).
- Phase 3 automação depende de scripts e funções estáveis (Phase 1/2).
- Phase 4 itens podem ser paralelizados após Phase 2.

