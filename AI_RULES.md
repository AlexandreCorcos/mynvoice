# AI_RULES.md

Operating rules for AI agents working in this repository. **Canonical process file.**
`CLAUDE.md` describes the app; this file governs how work is done, and wins on any conflict
about process.

**How it is organised (so a session loads little):**
- This file: every rule in one paragraph, the index, the constants. Read it every session.
- `docs/rules/Rn-*.md`: the detail of each rule. Read **only** when the task touches it.
- `docs/architecture/SYSTEM_CONTEXT.md`: what the system *is* (invariants, gotchas, the design
  system). Read before sensitive work; every subagent reads it first, because subagents cannot
  see memory or this session's context.

New rule = one paragraph here + a detail file, with a short rationale so the next agent can
judge edge cases.

---

## How to work (every session)

- **Language:** chat with the owner in the language they write (usually Portuguese). Code,
  commits, docs and comments in English; product copy in British English.
- **Output (R1):** answer first; no narration of the work between tool calls; short summary at
  the end. The owner pays for every token.
- **Pipeline (R2):** local → main. There is no staging: **local is the validation stage**, and
  `main` is production. Nothing sensitive (Tier C) reaches `main` without its review receipts.
- **Prove, don't assert.** Fix obvious bugs now (memory: fix-bugs-autonomously); bring product,
  business or isolation-widening decisions to the owner.
- **Isolation is the tripwire (R4):** anything that widens who can see another account's data is
  the owner's decision, never an "obvious fix".

---

## Index — where to look

| Topic | Look here |
|---|---|
| What the system is · design system · sessions · storage · admin | `docs/architecture/SYSTEM_CONTEXT.md` |
| Token economy | R1 |
| Push / gate / tiers / review team | R2 · `/gate` · `.claude/hooks/quality_gate.py` |
| Tests / guards | R3 · `backend/tests/` |
| Account isolation | R4 (the one boundary) |
| Versioning / update banner | R5 · `docs/versioning.md` |
| Importing invoices issued elsewhere | `docs/importing-invoices.md` |
| Admin access / step-up | `docs/admin-access.md` |
| Audits / prod smoke | `docs/Audit/audit.md` |

---

## Project constants

Not rules and not authorisations; settings that stay true between sprints.

- **Stack (locked):** Backend FastAPI + SQLAlchemy 2 async + Pydantic v2 + Alembic, Postgres.
  Frontend Next.js 15 + React 19 + Tailwind 4 + Framer Motion + dnd-kit. Storage Cloudflare R2
  (private) only via `app/services/storage.py`. Auth: HttpOnly session cookie + CSRF token;
  bearer accepted for cookie-less clients.
- **Design system:** Graphite & Brass. Tokens in `frontend/src/app/globals.css`; never a
  hardcoded hex. Full spec in `SYSTEM_CONTEXT.md`.
- **Audience:** small businesses, freelancers, the self-employed. English (UK) first, i18n-ready.
- **Isolation:** single-tenant. `users.id` is the only boundary, enforced by hand in every query.

---

## Rules

**R1 · Token economy.** The owner pays for every token.
- Answer first, in a sentence or two; then only what changes the next action. End with a short
  summary (what changed, what it means, what is open). Long form only when asked for an analysis.
- No running commentary between tool calls; no recap of the process; no restating rules.
- Never paste long output: summarise logs, diffs and queries; show the line that matters
  (`pytest -q --tb=short`, `| tail`). Read what you need: grep before reading, `offset/limit` on
  big files, never re-read a file you just read or edited, batch independent tool calls.
- Browser proof: one screenshot per behaviour, at reduced scale; prefer page text / element
  search over full accessibility snapshots.
- Subagents only where the task is broad or the review is owed (R2); give them a tight brief and
  demand a short answer. Default model sonnet; opus only for Tier C.
- A lesson that keeps recurring becomes a guard test (R3), not a longer memory or a longer file.
→ [`R01`](./docs/rules/R01-token-economy.md)

**R2 · Delivery pipeline: local → main.** *Local* is the validation stage: iterate freely, run
the suite, and for sensitive work run the review team here before pushing. *Main* is production.
The push gate (`.claude/hooks/quality_gate.py`) stands at the push to `main` and, **for Tier C
only**, requires receipts `qa` + `review` for the pushed tree, a version bump when code changed
(R5), and a green suite. Tier A (docs) and Tier B (routine code) are not blocked — the gate
advises, the author self-reviews. Agents run **once per unit of work, never per commit** (this is
the whole point: per-commit review is what burned ~2M tokens in the project this was ported from).
→ [`R02`](./docs/rules/R02-delivery-pipeline.md)

**R3 · Tests ship with the code.** Every feature ships unit tests for its pure surface
(guards, money maths, permission checks, state machines). Every bug fix ships a test that
**fails on the old code** — prove it: revert the fix, watch it fail, restore, say how. Recurring
incidents become **guard tests** that scan the code, so the lesson costs zero tokens per session
instead of a memory line read every time. Suite green before a push that reaches `main`.
→ [`R03`](./docs/rules/R03-tests.md)

**R4 · Account isolation is the one boundary.** MYNVOICE has no tenants. `users.id` is the only
wall between accounts and it is enforced by hand in every query — there is no framework guarantee.
Every owned query filters `user_id`; every foreign-key reference in a create/update body goes
through `assert_owned` (a foreign id → 404, not 403). Widening who can see another account's data
(admin included) is an **owner decision**, never an obvious fix. Guarded by
`tests/guards/test_user_isolation.py`. → [`R04`](./docs/rules/R04-account-isolation.md)

**R5 · Version bump.** Every change that reaches users bumps `frontend/package.json` `"version"`
**and** `frontend/public/meta.json` to match, in the same commit — it drives the in-app update
banner. Patch by default; minor for a feature; the owner calls a major. → [`R05`](./docs/rules/R05-versioning.md)
