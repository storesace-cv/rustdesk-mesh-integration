# Security & Permissions

## 1. Princípios Gerais

- Não expor `service_role` no frontend.
- Não confiar em `mesh_username` vindo do cliente; apenas do script no Mesh.
- Todas as operações devem ser autenticadas e, sempre que possível,
  autorizadas via RLS.

## 2. Perfis

Actualmente, assume‑se apenas 1 tipo de utilizador:
- Técnico / Admin — todos os utilizadores Supabase que podem aceder ao
  frontend.

Futuro:
- Podem ser introduzidos perfis (Admin, Técnico, ReadOnly) com tabela
  `user_profiles`. Este SoT reserva espaço conceptual para isso.

## 3. Protecção de Edge Functions

- `/login`:
  - Protegido por `Authorization: Bearer <anon_key>` com opção legacy do
    Supabase activada.
  - Deve validar que `email` e `password` existem antes de chamar o SDK.

- `/get-qr`, `/get-devices`:
  - Devem usar `access_token` do utilizador (`Authorization: Bearer <token>`).
  - Devem verificar o `sub` (user id) via `getUser()` e nunca confiar em
    dados passados no body para identificar o utilizador.

- `/register-device`:
  - Deve usar `service_role` para autenticar a função (não o utilizador).
  - Deve aceitar apenas requests de scripts controlados (Mesh).
  - Regras de segurança:
    - Validar que `device_id` não é vazio.
    - Validar que `mesh_username` corresponde a um `mesh_users` existente.

## 4. RLS Recomendado (resumo)

- `android_devices`:
  - SELECT/UPDATE/DELETE apenas quando `owner = auth.uid()`
  - Excepção: Edge Functions com `service_role`, que podem bypass RLS por
    necessidade técnica mas devem fazer validação manual.

- `mesh_users`:
  - Pode ser restrito a service_role apenas, se não houver necessidade do
    frontend o ler directamente.

## 5. Gestão de Segredos

- `service_role` e quaisquer outras chaves sensíveis:
  - Devem residir apenas em:
    - Variáveis de ambiente do Supabase (Edge Functions).
    - Variáveis de ambiente do servidor Mesh (scripts).

- Nunca devem ser commitados no GitHub.

## 6. Logs e Privacidade

- Os logs não devem conter:
  - Passwords.
  - Tokens JWT completos (no máximo prefixo + sufixo).

- É aceitável logar:
  - `device_id` (não é dado pessoal directo).
  - `mesh_username`.
  - Estados de erro genéricos.
