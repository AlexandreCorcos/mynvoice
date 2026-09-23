# CLAUDE.md

Guidance for Claude Code working in this repository. Kept short on purpose — the detail lives in
two files, read on demand, so a session loads little (R1, token economy).

## MYNVOICE

Open-source, free invoice and expense management for small businesses, freelancers and the
self-employed. Modern, elegant UX — not a generic SaaS tool. *"Your business. Your invoices."*

- **Backend** FastAPI + SQLAlchemy 2 async + Pydantic v2 + Alembic + Postgres (`/backend`)
- **Frontend** Next.js 15 + React 19 + Tailwind 4 + Framer Motion + dnd-kit (`/frontend`)

## Read these

- **[`AI_RULES.md`](./AI_RULES.md)** — how work is done: token economy (R1), the delivery
  pipeline and gate (R2), tests (R3), account isolation (R4), versioning (R5). **Read every
  session.** Rule detail is in `docs/rules/Rn-*.md`, read only when the task touches it.
- **[`docs/architecture/SYSTEM_CONTEXT.md`](./docs/architecture/SYSTEM_CONTEXT.md)** — what the
  system *is*: the isolation invariant, sessions/CSRF, admin, storage, the Graphite & Brass design
  system, the landing page and in-app UI kit, core features. **Read before sensitive work; every
  subagent reads it first.**

## The two things that catch everyone out

1. **Account isolation (R4).** `users.id` is the only boundary and it is enforced by hand in every
   query. Widening who sees another account's data is an owner decision, never an obvious fix.
2. **Version bump (R5).** Every user-facing change bumps `frontend/package.json` **and**
   `frontend/public/meta.json` in the same commit — it drives the update banner. See
   `docs/versioning.md`.

## Pipeline in one line

Local is the validation stage, `main` is production (no staging). Routine work pushes freely;
**Tier C** (money, auth, isolation, migrations, storage, deploy) needs its review receipts or the
gate blocks the push. Run `/gate` to see where the current work stands.
