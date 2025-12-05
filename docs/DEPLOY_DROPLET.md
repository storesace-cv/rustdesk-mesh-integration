### 1.4 `docs/DEPLOY_DROPLET.md`

```bash
cat << 'EOF' > docs/DEPLOY_DROPLET.md
# Deploy no Droplet (142.93.106.94)

## Estrutura no droplet

- Código do frontend: `/opt/rustdesk-mesh-integration`
- Entrypoint systemd: `/opt/rustdesk-frontend/start.sh` (carrega `.env.production`/`.env.local` se existirem e lança `next start`)
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
```

> ⚠️ Antes de correr, garante que `SUPABASE_PROJECT_REF` está definido no ambiente local (necessário pelo `scripts/update_supabase.sh` chamado pelo fluxo). O script tenta derivar o project-ref a partir de `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` se estiverem no `.env.local`, mas exporta manualmente `SUPABASE_PROJECT_REF` se preferires ser explícito. Se apenas quiseres fazer deploy do código sem tocar no Supabase, usa `SKIP_SUPABASE=1 scripts/update_to_droplet.sh`.

> ℹ️ O script carrega automaticamente variáveis de ambiente de `.env.local` na raiz do repositório (ou de um ficheiro alternativo definido em `ENV_FILE`). Usa o ficheiro partilhado em `~/Documents/NetxCloud/projectos/bwb/desenvolvimento/rustdesk-mesh-integration/.env.local` para injectar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL` e `SUPABASE_ACCESS_TOKEN` antes de correr o deploy.

## 1.1 Fluxo completo: do GitHub até ao droplet

Este é o percurso canónico sempre que há alterações novas no GitHub e é necessário publicá‑las no droplet `142.93.106.94`:

1. **Actualizar o repositório local com o GitHub**
   - Estar na branch `my-rustdesk-mesh-integration`.
   - `git fetch --prune` e `git pull --ff-only` (ou `git reset --hard origin/my-rustdesk-mesh-integration` se for apenas uma estação CI). O objectivo é que o working tree local seja uma cópia exacta do GitHub.
2. **Preparar variáveis de ambiente**
   - Carregar `.env.local` (ou o ficheiro apontado por `ENV_FILE`) contendo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN` e idealmente `SUPABASE_PROJECT_REF`.
   - Se quiseres **só** enviar código sem tocar no Supabase, define `SKIP_SUPABASE=1`.
3. **Executar o deploy local → droplet**
   - Na raiz do repositório local, correr `scripts/update_to_droplet.sh`.
   - O script:
     1. Verifica o estado limpo do git (a não ser que uses `SKIP_DIRTY_CHECK=1`).
     2. Chama `scripts/update_supabase.sh` (a menos que uses `SKIP_SUPABASE=1`).
     3. Faz `git push origin my-rustdesk-mesh-integration`.
     4. Liga por SSH ao droplet, faz `git fetch --prune`, `git reset --hard origin/my-rustdesk-mesh-integration`, `npm ci`, `npm run build` e `systemctl restart rustdesk-frontend.service`.
     5. Cria log remoto e copia‑o para `logs/deploy/`.
4. **(Alternativa) Actualizar directamente no droplet a partir do GitHub**
   - Se já estás dentro do droplet e só queres trazer o código publicado, usar `/opt/rustdesk-mesh-integration/scripts/update_from_github.sh`.
   - Ele faz `git fetch --prune`, `git reset --hard origin/my-rustdesk-mesh-integration`, `npm install`, `npm run build` e reinicia o serviço.
   - ⚙️ Não é necessário compilar manualmente no portátil: tanto `update_to_droplet.sh` (fluxo local→droplet) como `update_from_github.sh` (no próprio droplet) executam `npm run build` dentro do droplet antes de reiniciar o serviço. Só precisas de correr `npm run build` localmente se quiseres validar o build antes de publicar.
5. **Verificar serviço**
   - Após o deploy (via script local ou via update_from_github no droplet):
     - `systemctl status rustdesk-frontend.service`
     - `curl -I http://127.0.0.1:3000`
   - Conferir se há erros nos logs copiados para `logs/deploy/`.

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

