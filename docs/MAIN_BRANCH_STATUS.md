# Main branch status

**Data:** 2025-12-07

## Visão geral
- As branches `main` e `work` estão alinhadas e apontam para o commit mais recente desta linha de desenvolvimento (ver `git rev-parse --short HEAD`).
- Não existem outras branches locais ou remotas com divergências conhecidas neste repositório.
- O repositório continua alinhado com o SoT humano em `docs/sot/` e com as notas de versão em `.github/release-notes/`.

## Fontes de verdade e documentação
- **SoT:** `docs/sot/README.md` descreve a estrutura e o índice completo das especificações funcionais, contratos, integrações e playbook operacional.
- **Notas de versão:** `.github/release-notes/v0.1.0.md` documenta o estado actual (Edge Functions, migração Supabase, scripts de deploy).
- **Guias operacionais:** consulte `docs/DEPLOY_DROPLET.md`, `docs/SETUP_LOCAL.md` e `docs/ROADMAP.md` para fluxos de deploy, desenvolvimento local e tarefas em aberto.

## Política de branches
- `main` é a base canónica para código, documentação, migrações e scripts. Mantenha-a fast-forward em relação à `work` para preservar a consistência.
- Crie branches de trabalho a partir de `main` e integre-as de volta apenas quando alinhadas com o SoT em `docs/sot/` e com as notas de versão actualizadas.
- Actualizações de documentação e scripts devem acompanhar qualquer alteração funcional para manter o SoT sincronizado.

## Resumo desta sincronização
- `main` e `work` permanecem sincronizadas; use `git status`/`git rev-parse --short HEAD` para confirmar após cada alteração.
- README e documentação continuam a apontar para o SoT real (`docs/sot/`) e para as notas de versão em `.github/release-notes/`.
- Este ficheiro confirma que `main` permanece a fonte canónica e actualizada de acordo com o SoT.
