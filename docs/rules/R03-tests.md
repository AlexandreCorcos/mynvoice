# R03 — Tests ship with the code

> Detail of **R3** in [`AI_RULES.md`](../../AI_RULES.md). Read when writing or changing tests.

## The rules

- **Every feature ships unit tests for its pure surface**: guards, permission checks, money maths,
  state machines, resolvers, schemas.
- **Every bug fix ships a test that FAILS on the old code.** Prove it: revert the fix, run, watch
  it fail, restore. Say how in the report. A test that passes on both sides tests nothing.
- **The suite is green before a push that reaches `main`** (R2 gate).
- Name a regression test after the finding in the docstring (`v0.x.y`, `AUD-12`) so the trail
  reads back.

## Layout

```
backend/tests/
├── conftest.py      fakes: FakeSession (scripted results), FakeResult, SimpleNamespace rows
├── unit/            DB-free, runs in seconds; imports only light modules
└── guards/          walk the codebase and fail on a CLASS of defect
```

`pytest.ini`: `testpaths = tests/unit tests/guards`. Stdlib and fakes first; no new test
dependency without a reason; no `datetime.now()` in assertions — use explicit timestamps.

Unit tests stay DB-free by scripting the session (`FakeSession([FakeResult(scalar=...)])`) rather
than importing the whole app. Keep imports light: a unit test that pulls in `config`, the DB
session and every model is slow and flaky.

## Guard tests: turn incidents into checks

Each recurring incident becomes a test that scans the code, so the lesson costs zero tokens
instead of a memory line read every session. Extend a guard's allow-list deliberately or not at
all. Every guard must be **proven to fail on a planted defect** — plant it, watch red, restore.

| Guard (`backend/tests/guards/`) | Incident / invariant it locks |
|---|---|
| `test_user_isolation.py` | Account isolation (R4): per-handler AST scan — a route handler runs `select()` on owned data without a `user_id` filter |
| `test_money_serialisation.py` | A schema money field typed bare `Decimal` serialises to a JSON string (v0.14.0) |
| `test_session_cookie_host_only.py` | A session cookie set with `Domain=` would leak to every subdomain |

Unit tests so far: `test_money_type.py` (the `Money` JSON contract), `test_invoice_totals.py` (the
money surface — subtotal/tax/total maths and the negative-total / due-before-issue guards, pulled
into `app/services/invoice_totals.py` so they test without importing the app).

Not guarded yet (ideas): `assert_owned` on every create/update foreign reference (prove the filter
is on the *same* query, not just present in the handler); `credentials: "include"` on every
frontend request; a single alembic head; the invoice state machine (paid is locked).

## CI

`.github/workflows/ci.yml` runs the backend suite (pytest + guards) and the frontend lint on every
push to `main` and every PR. It is the safety net for a push from a machine without the local gate,
and it covers the frontend, which the local gate deliberately does not. The backend job installs
only `pytest`, `pydantic` and `fastapi` (pinned to the backend's versions) — the suite never
touches Postgres, so the heavy runtime deps stay out of CI.

## Commands

```bash
python -m pytest -q --tb=short          # the gate suite (unit + guards)
pip install -r requirements-dev.txt     # pytest, once
```
