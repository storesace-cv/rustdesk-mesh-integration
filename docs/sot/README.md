# RustDesk ⇄ MeshCentral ⇄ Supabase — Source of Truth (SoT)

**Project:** `rustdesk-mesh-integration`  
**Date:** 2025-12-01  
**SoT Mode:** Hybrid — MeshCentral is the *event source*, Supabase is the *authoritative catalogue*.

This folder contains the *human* Source of Truth for the RustDesk + MeshCentral + Supabase
integration used by `rustdesk.bwb.pt` and `mesh.bwb.pt`.

Everything Codex / Softgen.ai / humans should respect is defined here:
data model, flows, contracts, and operational rules.

## Structure

- `architecture.md` — High‑level view, components and responsibilities.
- `data-models.md` — Tables, fields, relations, enums.
- `meshcentral-integration.md` — Filesystem, scripts, how Mesh talks to Supabase.
- `supabase-integration.md` — Auth model, policies, edge functions (contracts).
- `frontend-behaviour.md` — Next.js app behaviour, UX rules, error handling.
- `sync-engine.md` — “Hybrid model” rules & reconciliation logic.
- `api-contracts.md` — Precise input/output shapes for functions & endpoints.
- `security-and-permissions.md` — Who can do what, and how it is enforced.
- `operational-playbook.md` — How to deploy, troubleshoot, rotate keys.
- `roadmap.md` — What is done, what is missing, and priorities.
- `glossary.md` — Definitions for all terms used in these docs.

**Golden Rule:** If code, scripts or DB differ from this SoT, the SoT wins.  
The job of Codex / developers is to bring reality back in line with this SoT.
