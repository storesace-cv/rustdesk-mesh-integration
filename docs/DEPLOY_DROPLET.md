### 1.4 `docs/DEPLOY_DROPLET.md`

```bash
cat << 'EOF' > docs/DEPLOY_DROPLET.md
# Deploy no Droplet (142.93.106.94)

## Estrutura no droplet

- Código do frontend: `/opt/rustdesk-mesh-integration`
- Entrypoint systemd: `/opt/rustdesk-frontend/start.sh` (carrega `.env.production`/`.env.local` se existirem e lança `next start`)
- Serviço systemd: `rustdesk-frontend.service`
- Next.js corre em: `http://142.93.106.94:3000` (por trás de DNS `rustdesk.bwb.pt`).

## 1. Fluxo Step-* (sem compilar no droplet)

Os passos seguintes são executados sempre via scripts com prefixo `Step-*`:

1. **Step-1 – sincronizar com `origin/main`**
   - `scripts/Step-1-download-from-main.sh`
   - Garante que a branch local `my-rustdesk-mesh-integration` espelha `origin/main`.
2. **Step-2 – build local**
   - `scripts/Step-2-build-local.sh`
   - Corre `npm ci` + `npm run build` no portátil para gerar `.next` e `node_modules` já validados.
   - Gera marcadores `.next/BUILD_COMMIT`, `.next/BUILD_BRANCH` e `.next/BUILD_TIME` para registar commit, branch e timestamp do build. O Step-5 valida estes marcadores antes de qualquer deploy.
3. **Step-3 – testes no portátil**
   - `scripts/Step-3-test-local.sh`
   - Corre lint e testes (`npm run lint`, `npm test`). Logs ficam em `logs/local/`.
4. **Step-5 – deploy do build testado**
   - `scripts/Step-5-deploy-tested-build.sh`
   - Envia via `rsync` o código + `.next` + `node_modules` para o droplet e reinicia o serviço. **Não recompila** no droplet; reutiliza o build local testado.
   - Usa `rsync --checksum` para enviar apenas os ficheiros cujo conteúdo mudou desde o último deploy.
5. **Step-4 – recolher logs em caso de erro**
   - `scripts/Step-4-collect-error-logs.sh`
   - Comprime os logs de `logs/local/` e `logs/deploy/` para partilha sempre que algum passo falha (por exemplo, se o Step-5 gerar erros de deploy).

> ⚠️ Se precisares apenas de alinhar o código no próprio droplet (sem os artefactos locais), `scripts/update_from_github.sh` continua disponível como fallback, mas foge ao fluxo sem compilação remota.

## 1.1 Notas de verificação

- Logs locais ficam em `logs/local/` (passos 1–3) e logs de deploy em `logs/deploy/` (passo 5).
- O serviço é reiniciado via `systemctl restart rustdesk-frontend.service` após sincronizar os artefactos já construídos.

2. Actualizar código no droplet a partir do GitHub

No droplet:
/opt/rustdesk-mesh-integration/scripts/update_from_github.sh

O script:
	1.	Faz git fetch origin + git reset --hard origin/my-rustdesk-mesh-integration.
	2.	Corre npm install.
	3.	Corre npm run build.
	4.	Reinicia o serviço rustdesk-frontend.service.

3. Edge Functions no Supabase

As Edge Functions vivem no painel Supabase, mas o código-fonte deve ser mantido aqui:
	•	supabase/functions/login/index.ts
	•	supabase/functions/get-devices/index.ts
	•	supabase/functions/register-device/index.ts
	•	supabase/functions/remove-device/index.ts

Fluxo recomendado para alterações:
	1.	Editar o código no repositório (ficheiros acima).
	2.	Copiar conteúdo para a função correspondente no painel Supabase.
	3.	Deploy da função.
	4.	Comitar as alterações neste repositório (SoT).

4. MeshCentral e sync de dispositivos

No droplet MeshCentral, existe (ou existirá) um script:
	•	/opt/meshcentral/sync-devices.sh

Responsável por:
	•	Ler devices.json em:
	•	/opt/meshcentral/meshcentral-files/ANDROID/<User>/devices.json
	•	Enviar/actualizar dispositivos em public.android_devices no Supabase (provavelmente via Edge Function register-device ou acesso directo à DB).

Para o Codex:
Trazer o script actual para este repositório (em scripts/) e documentar o formato exacto de devices.json e o mapeamento para android_devices.

