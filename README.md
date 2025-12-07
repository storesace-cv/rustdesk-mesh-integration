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
- `scripts/` – Scripts auxiliares (fluxo Step-* obrigatório):
  - `Step-1-download-from-main.sh` – obtém `origin/main` e sincroniza a branch de testes local.
  - `Step-2-build-local.sh` – instala dependências e gera o build local.
  - `Step-3-test-local.sh` – corre lint + testes no portátil.
  - `Step-4-deploy-tested-build.sh` – envia o build já testado para o droplet e reinicia o serviço sem recompilar.
  - `Step-5-collect-error-logs.sh` – junta logs de `logs/local/` e `logs/deploy/` após qualquer falha (incluindo no Step-4),
    gera um bundle numerado e actualiza o symlink `logs-latest.tar.gz`.
  - `get-error-log.sh` – numera cada recolha, guarda o ficheiro em `logs/droplet/run-<id>-app-debug.log`, actualiza o symlink `latest-app-debug.log` e **publica sempre**: copia `logs/` para `local-logs/`, faz `git add -f`, `commit` e `push` automático (use `--no-publish`/`PUBLISH=0` apenas se quiser evitar este passo).
  - `sync-devices.sh` – ler devices.json do MeshCentral e enviar para Supabase.
  - `update_from_github.sh` – sincronização rápida no próprio droplet (fallback).
  - `update_supabase.sh` – operações da Supabase CLI.
- `docs/ROADMAP.md` – Tarefas para o Codex.

### Frontend: convenção do campo `notes`

- **Grupo único:** `notes = "Grupo | Comentário"` → agrupa pelo `Grupo`.
- **Grupo + SubGrupo:** `notes = "Grupo | SubGrupo | Comentário"` → agrupa por
  `Grupo` e depois por `SubGrupo`.
- **Por adotar:** `notes = ""` ou `notes = NULL` → o device é mostrado em
  **"Dispositivos por Adotar"**.

Ver `docs/ROADMAP.md` para detalhes e tarefas abertas.

## Logs

- `logs/` (local apenas):
  - Guardar tudo o que é gerado no portátil ou descarregado do droplet (incluindo `logs/droplet`).
  - Ignorado pelo Git para impedir sincronização acidental. Estrutura principal:
    - `logs/droplet/run-<id>-app-debug.log` + symlink `latest-app-debug.log` para a recolha mais recente.
    - `logs/archive/run-<id>-logs-<timestamp>.tar.gz` + symlink `logs-latest.tar.gz` para o último bundle do Step-5 (inclui
      logs locais e de deploy quando existirem).
- `local-logs/` (apenas GitHub):
  - Recebe ficheiros copiados automaticamente via `scripts/get-error-log.sh` sempre que o script corre (a menos que use `--no-publish`).
  - Não deve ser utilizado como pasta de trabalho local; limpa-o depois de publicar se não precisares das cópias.

Pastas antigas como `local-logslocal/` não têm uso e foram removidas.

# rustdesk-mesh-integration

Este repositório utiliza um **Source of Truth (SoT)** centralizado para garantir consistência, regras claras e alinhamento entre documentação, código e automações.

## 📘 Source of Truth (SoT)

O SoT encontra-se em `docs/sot/` (ver `docs/sot/README.md` para o índice completo). Estes
ficheiros definem a arquitectura, contratos, integrações com o MeshCentral/Supabase e o
playbook operacional. Todos os módulos, scripts e prompts devem seguir rigorosamente estes
documentos.

## 🧾 Notas de versão

- Última release documentada: `v0.1.0` — ver `.github/release-notes/v0.1.0.md`.
- Estado da branch principal e alinhamento de SoT: ver `docs/MAIN_BRANCH_STATUS.md`.

## 🚀 Fluxo de Trabalho

1. Actualizar ou validar os ficheiros SoT em `docs/sot/`.
2. Confirmar que qualquer alteração no código está alinhada com o SoT.
3. Realizar commits para a branch `main`.
4. Softgen.ai deve ser instruído com prompts que carregam os ficheiros SoT conforme listado em `docs/sot/README.md`.

## 📤 Envio para GitHub

```
git add .
git commit -m "Atualização README e alinhamento com SoT"
git push origin main
```
