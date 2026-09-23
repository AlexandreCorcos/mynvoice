# R05 — Version bump

> Detail of **R5** in [`AI_RULES.md`](../../AI_RULES.md). Full process, semver guide and how the
> update banner works: [`docs/versioning.md`](../versioning.md).

## The rule

Every change that reaches users bumps, **in the same commit**:
- `frontend/package.json` → `"version"`
- `frontend/public/meta.json` → `"version"` (must match)

The frontend polls `meta.json`; when it moves past the running version, the in-app update banner
appears. The two files disagreeing means the banner never fires (or fires wrong), so the gate
checks the bump on any Tier B/C push.

## Which part to bump

- **Patch** (`0.29.x`) — a fix or a small change. The default.
- **Minor** (`0.x.0`) — a feature. Recent history bumps minor per feature (see the git log).
- **Major** — the owner's call only.

Docs-only changes (Tier A) do not need a bump.
