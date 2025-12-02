# Roadmap — RustDesk Mesh Integration

## 1. Estado Actual (segundo este SoT)

- Supabase project criado.
- Tabelas base:
  - `mesh_users`
  - `android_devices`
  - `android_devices_expanded` (view conceptualmente definida).
- Edge Functions base:
  - `/login`
  - `/get-qr`
  - `/get-devices`
  - `/register-device`
- Frontend Next.js:
  - Login page.
  - Dashboard com QR (domínio `rustdesk.bwb.pt`).
- MeshCentral:
  - Estrutura de pastas ANDROID criada.
  - `android-users.json` existente.

## 2. Tarefas Imediatas (Alta Prioridade)

1. **Consolidar implementação do SoT nas Edge Functions**
   - Garantir que `/get-devices` usa `android_devices_expanded`.
   - Garantir que `/register-device` faz upsert correcto com `device_id`.

2. **Implementar script `sync-devices.sh` no repo**
   - Código robusto para:
     - Ler `android-users.json`.
     - Ler `devices.json`.
     - Chamar `/register-device`.
   - Documentar instalação via cron/systemd.

3. **Frontend: UX de “Dispositivos por adoptar”**
   - Listar devices `is_adopted = false` num grupo separado.
   - Mostrar mensagem amigável se não existirem devices.

4. **Frontend: Agrupamento por Grupo / Subgrupo**
   - Implementar lógica visual (não de parsing) para:
     - Grupo → Subgrupo → Cards.

## 3. Próximos Passos (Médio Prazo)

5. **Edição de notes (adopção & reorganização)**
   - Criar API/Edge Function `/adopt-device` ou similar.
   - Implementar modal de edição de notas.

6. **Segurança & RLS**
   - Endurecer RLS em `android_devices`.
   - Conferir que nenhuma função expõe dados de terceiros.

7. **Documentação de Infraestrutura**
   - Documentar Nginx / reverse proxy para `rustdesk.bwb.pt`.
   - Descrever certificados TLS e renovação.

## 4. Futuro (Boa Vontade / Nice to Have)

8. **Deep-Link para RustDesk no Desktop**
   - Botão “Abrir no RustDesk” que tenta invocar RustDesk localmente.

9. **App Mobile para Técnicos**
   - Pequeno cliente React Native/Expo ou PWA para consultar devices.

10. **Relatórios & Auditoria**
   - Dashboards de utilização.
   - Históricos de adopção/movimentos de devices.

Este roadmap deve ser mantido vivo: sempre que Codex / humanos avançarem,
esta lista deve ser revista e anotada (feito / em curso / bloqueado).
