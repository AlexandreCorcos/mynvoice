Explain the push gate's view of the current work and the next step (AI_RULES R2).

1. Run `bash .claude/hooks/quality-gate status` and show its lines as they are.
2. Translate into the next action, from the tier line:
   - **A (docs only)**: push to `main` freely.
   - **B (routine code)**: extend `backend/tests/`, run `python -m pytest -q --tb=short` from
     `backend/`, look at the diff (Skill("code-review") when it deserves it), bump
     `frontend/package.json` + `frontend/public/meta.json` (R5), commit. The gate does not block
     Tier B — push when green.
   - **C (sensitive)**: the review team runs once for the whole unit of work: `qa-engineer` +
     `code-reviewer` (+ `db-architect` for `alembic/`/`models/`, + `security-engineer` for
     auth/isolation/money/storage). Independent agents in parallel. On approval they record
     `qa` + `review`; then bump the version and push. Without both receipts the gate blocks the
     push to `main`.
   - "git layer: OFF" → `git config core.hooksPath .githooks`.
   - Uncommitted tracked edits: the gate tests the pushed commit in a temp worktree, so they are
     ignored, but they will not ship either.
3. Keep the answer short (R1).
