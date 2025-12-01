### 1.4 `docs/DEPLOY_DROPLET.md`

```bash
cat << 'EOF' > docs/DEPLOY_DROPLET.md
# Deploy no Droplet (142.93.106.94)

## Estrutura no droplet

- Código do frontend: `/opt/rustdesk-mesh-integration`
- Serviço systemd: `rustdesk-frontend.service`
- Next.js corre em: `http://142.93.106.94:3000` (por trás de DNS `rustdesk.bwb.pt`).

## 1. Sincronizar a partir do portátil (script local)

No portátil, na raiz do repositório:

```bash
scripts/update_to_droplet.sh

Este script faz:

rsync -avz --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".next" \
  ./ root@142.93.106.94:/opt/rustdesk-mesh-integration/

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

