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

O SoT encontra-se em `docs/softgen/`:

- `docs/softgen/00-master-mode.md`
- `docs/softgen/ota.md`
- `docs/softgen/HTNG.md`
- `docs/softgen/pms-01-core-entities.md`
- `docs/softgen/pms-02-reservations.md`
- `docs/softgen/pms-03-rates-night-audit.md`
- `docs/softgen/pms-04-accounts-billing.md`
- `docs/softgen/pms-05-pos-logs-validator.md`
- `docs/softgen/pms-06-fiscal-doc-rules.md`

Todos os módulos, scripts e prompts devem seguir rigorosamente estes documentos.

## 🚀 Fluxo de Trabalho

1. Actualizar ou validar os ficheiros SoT em `docs/softgen/`.
2. Confirmar que qualquer alteração no código está alinhada com o SoT.
3. Realizar commits para a branch `main`.
4. Softgen.ai deve ser instruído com prompts que carregam estes ficheiros em ordem.

## 📤 Envio para GitHub

```
git add .
git commit -m "Atualização README e alinhamento com SoT"
git push origin main
```

## 🧠 Prompt para o Codex (Softgen.ai)

```
Before acting on the request below, please load and process ALL the following SoT files
in the exact order listed:

1. docs/softgen/00-master-mode.md
2. docs/softgen/ota.md
3. docs/softgen/HTNG.md
4. docs/softgen/pms-01-core-entities.md
5. docs/softgen/pms-02-reservations.md
6. docs/softgen/pms-03-rates-night-audit.md
7. docs/softgen/pms-04-accounts-billing.md
8. docs/softgen/pms-05-pos-logs-validator.md
9. docs/softgen/pms-06-fiscal-doc-rules.md

After fully loading and internalizing ALL these files in the specified order,
proceed with the requested task.
```
