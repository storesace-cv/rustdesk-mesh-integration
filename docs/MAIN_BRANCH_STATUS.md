# Main branch status

**Data:** 2025-12-05

## Visão geral
- A branch `work` (commit `ab5cfb8`: release notes da versão `v0.1.0`) foi promovida para se tornar a nova `main`.
- Não existem outras branches locais ou remotas com divergências conhecidas neste repositório.
- O repositório continua alinhado com o SoT humano em `docs/sot/` e com as notas de versão em `.github/release-notes/`.

## Fontes de verdade e documentação
- **SoT:** `docs/sot/README.md` descreve a estrutura e o índice completo das especificações funcionais, contratos, integrações e playbook operacional.
- **Notas de versão:** `.github/release-notes/v0.1.0.md` documenta o estado actual (Edge Functions, migração Supabase, scripts de deploy).
- **Guias operacionais:** consulte `docs/DEPLOY_DROPLET.md`, `docs/SETUP_LOCAL.md` e `docs/ROADMAP.md` para fluxos de deploy, desenvolvimento local e tarefas em aberto.

## Política de branches
- `main` é a base canónica para código, documentação, migrações e scripts.
- Crie branches de trabalho a partir de `main` e integre-as de volta apenas quando alinhadas com o SoT em `docs/sot/` e com as notas de versão actualizadas.
- Actualizações de documentação e scripts devem acompanhar qualquer alteração funcional para manter o SoT sincronizado.

## Resumo desta sincronização
- Promoção da branch `work` para `main`, preservando o estado documentado em `v0.1.0`.
- README actualizado para apontar para o SoT real (`docs/sot/`) e para as notas de versão em `.github/release-notes/`.
- Este ficheiro foi adicionado para clarificar o estado canónico da branch `main` e as referências de SoT.
