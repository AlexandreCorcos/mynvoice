# R02 — Delivery pipeline: local → main

> Detail of **R2** in [`AI_RULES.md`](../../AI_RULES.md). Read before a push to `main`, or when
> changing the gate.

Ported from LOGVEX/GoClini, which learnt the expensive way: per-commit review agents cost ~2M
tokens in one session and almost nothing shipped. The model that worked: **free iteration where
nothing is real, paid review at the border, only for sensitive changes, once per unit of work.**

MYNVOICE has **no staging server**. So the two-border model collapses to one: **local is the
validation stage, `main` is production.** The owner pushes straight to `main` on purpose — the
gate must not get in the way of routine work, only stand firm on the sensitive.

## The two stages

| Stage | Where | What must pass | Review cost |
|---|---|---|---|
| **Local** | Owner's machine (`python dev.py` / Docker) | Nothing gated. Prove behaviour here. For Tier C, run the review team here before pushing | none for A/B |
| **Main** | `git push origin main` → production | **Gate, Tier C only:** receipts `qa` + `review` for the pushed tree · version bump when code changed (R5) · suite green · frontend build/lint when frontend changed. Tier A/B: advised, not blocked | Tier C: the team |

Pushing routine work to `main` needs no ceremony. A Tier C change does: its receipts, or the gate
blocks the push.

## Tiers (decide by blast radius, not by the screen)

Ask: *if this is subtly wrong, does it leak another account's data, put a wrong number into money,
or break a migration/deploy?*

- **A — docs only** (`docs/`, `*.md`, images). No suite, no receipts.
- **B — routine code.** The author writes/extends the tests (R3), reviews the diff (Skill
  `code-review` when it deserves it), bumps the version, records both receipts inline. No subagents.
- **C — sensitive.** Any change touching: `backend/alembic/`, `backend/app/models/`; auth,
  session, cookies, CSRF, step-up, `/sys/ctrl`, admin, permissions; invoices, payments, expenses,
  money/tax/totals, ledger, accounting periods; storage/R2/uploads; `backend/app/core/config.py`,
  `backend/app/main.py`, `backend/app/api/deps.py`, Docker/compose; the gate itself. The review
  team runs at the push (below). **When unsure, it is C.** The gate's detector errs towards C and
  only advises; it never lowers what the stage requires.

## The review team (`.claude/agents/`)

**Once per unit of work, at the push to `main`, only for Tier C.**

| Agent | Model | Hunts |
|---|---|---|
| `qa-engineer` | sonnet (opus for money) | Test plan; a bug-fix test that fails on the old code; edges (null/zero/other user/hostile input) |
| `code-reviewer` | sonnet; opus when Tier C | Runs Skill `code-review` first, then the MYNVOICE checklist (isolation, money, refresh-after-update, version bump). GO / NO-GO |
| `security-engineer` | opus | Cross-user leaks, authz bypass, hostile input → 500, secrets |
| `db-architect` | sonnet | Single alembic head, indexes on new filters, every owned query scoped by `user_id` |

Each agent: reads `SYSTEM_CONTEXT.md` + its own checklist; confirms in the code or DB before
asserting; answers in **at most ~20 lines**; records its receipt only on approval. Independent
agents run in parallel.

## Receipts and the gate

- Stored in the git common dir, `.git/quality-gate/<tree>.<kind>` (never committed), keyed by the
  **git tree** of the pushed commit. An edit after the review is a new tree: record again.
- Kinds: `qa` + `review`. `suite` marks a green run per tree.
- `bash .claude/hooks/quality-gate record <kind> [rev]` and `... status` (or `/gate`).
- Checks run on exactly the pushed tree (in place when it is HEAD and clean, else a throwaway
  worktree), so a parallel session's edits never leak in.
- Harness layer: a PreToolUse hook refuses `--no-verify` and force pushes to `main`. Threat model
  is **forgetting, not fraud**: `SKIP_QUALITY_GATE=1` (owner only) skips the checks.
