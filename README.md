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
