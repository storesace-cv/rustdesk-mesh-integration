# API Contracts — Summary

Este documento é um resumo operacional dos contratos de API; detalhes
mais extensos foram colocados em `supabase-integration.md`.

## 1. Edge Function: /login

- **Método:** POST
- **Headers obrigatórios:**
  - `Authorization: Bearer <anon_key>`
  - `Content-Type: application/json`
- **Body:** `{ "email": string, "password": string }`
- **Resposta 200:** `{ "token": string }`

## 2. Edge Function: /get-qr

- **Método:** POST ou GET (conforme implementação actual).
- **Headers obrigatórios:**
  - `Authorization: Bearer <user_access_token>`
- **Body:** vazio.
- **Resposta 200:**
  ```json
  {
    "config": {
      "host": "rustdesk.bwb.pt",
      "relay": "rustdesk.bwb.pt",
      "key": "Rs16v4T5zElCIsxbcAn39LwRYniVi5EQbXAgLVqWFYk="
    }
  }
  ```

## 3. Edge Function: /get-devices

- **Método:** POST ou GET.
- **Headers obrigatórios:**
  - `Authorization: Bearer <user_access_token>`
- **Body:** vazio.
- **Resposta 200:** array de devices (0..N).

Cada device:

```json
{
  "id": "uuid",
  "device_id": "1403938023",
  "friendly_name": "Smartphone Android do Jorge (teste)",
  "group_name": "Pessoal",
  "subgroup_name": null,
  "notes": "Pessoal | Smartphone Android do Jorge (teste)",
  "is_adopted": true,
  "last_seen_at": "2025-12-01T02:30:00Z"
}
```

## 4. Edge Function: /register-device

- **Método:** POST
- **Headers obrigatórios:**
  - `Authorization: Bearer <service_role_key>`
  - `Content-Type: application/json`
- **Body:**

```json
{
  "device_id": "1403938023",
  "mesh_username": "admin",
  "friendly_name": "Smartphone Android do Jorge (teste)",
  "last_seen": "2025-12-01T02:30:00Z"
}
```

- **Resposta 200 (exemplo):**

```json
{
  "status": "ok",
  "id": "uuid-da-linha",
  "is_new": true
}
```

## 5. Futuras APIs

- `/adopt-device` (ou equivalente)
  - Para definir/editar notas.
- `/remove-device`
  - Para arquivar ou desassociar devices.

Para qualquer nova API, este ficheiro deve ser actualizado com:

- Nome da função
- Método
- Corpo esperado
- Respostas possíveis
