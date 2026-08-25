# Audit & Verification Index — MYNVOICE

Entry point for every audit **playbook you can run**, plus the archive of past runs.
Each file under `playbooks/` is a **SCOPE** (what to test); everything identical across runs —
environments, accounts, database access, tools, bug policy — lives **once**, here, in
**§ MANDATORY SHARED CONTEXT**. Playbooks do not repeat it; a run reads this file first.

### Folder layout
| Folder | What's in it |
|---|---|
| **`playbooks/`** | ▶ the audits you **RUN** — scope only, pointing back here for the shared rules |
| **`result/`** | Outputs of runs + **`RUN_LOG.md`** (the run ledger). Every new run lands here |
| **`archive/`** | Historical one-off reports. **Reference only — not runnable** |

---

## ▶ HOW I RUN AN AUDIT — ask first, never auto-run

When the owner says **"read audit.md"** (or *"leia o audit.md"*), do **NOT** start anything. First bring
the owner a menu and collect the run parameters:

1. Show the **numbered playbook index** below.
2. Ask three things: **(a) which number**, **(b) loop or single pass**, **(c) how many hours**.
3. **Wait** for the answer — e.g. `2 — single pass, 1 hora`.
4. Only then run that playbook, in that mode, for that duration, following
   **§ MANDATORY SHARED CONTEXT** and the playbook's own SCOPE. At the end, produce the report and
   record the run.

> This ask-first step is mandatory every time — the owner chooses the target, the mode and the hours.

### The menu (runnable playbooks)
| # | Playbook | File | Target | Mode |
|---|---|---|---|---|
| **1** | Cross-account isolation — does data leak between users? | [`playbooks/ACCOUNT_ISOLATION.md`](playbooks/ACCOUNT_ISOLATION.md) | **LOCAL** | 🔴 authenticated security — cross-boundary writes must be *blocked* |
| **2** | Money & invoice integrity | [`playbooks/MONEY_INVOICE_INTEGRITY.md`](playbooks/MONEY_INVOICE_INTEGRITY.md) | **LOCAL** | 🟠 read-write + concurrency |
| **3** | Session, CSRF, admin & step-up | [`playbooks/AUTH_SESSION_CSRF_ADMIN.md`](playbooks/AUTH_SESSION_CSRF_ADMIN.md) | **LOCAL + PROD** | 🔴 authenticated security |
| **4** | Black-box, unauthenticated public surface | [`playbooks/UNAUTH_BLACKBOX.md`](playbooks/UNAUTH_BLACKBOX.md) | **PROD** | 🔴 unauth — read-only, no login |
| **5** | Input robustness, uploads, PDF & email abuse | [`playbooks/INPUT_ROBUSTNESS.md`](playbooks/INPUT_ROBUSTNESS.md) | **LOCAL** | 🟠 read-write, hostile input |

> **#1, #2, #3 and #5 write, and MYNVOICE has no staging**, so they run against **local**. #4 is
> unauthenticated and read-only, so it runs against production. #3 additionally re-verifies its
> cookie and CSRF findings against **production**, for the reason in §6 — the local environment
> cannot reproduce the cross-host conditions that have already caused two outages.

---

## 🔒 MANDATORY SHARED CONTEXT — in force for every run

### 1. Environments — there is no staging

| | Local | Production |
|---|---|---|
| App | `http://localhost:3000` | `https://app.mynvoice.com` (also `mynvoice.com`, `www.`) |
| API | `http://localhost:8000/api/v1` | `https://api.mynvoice.com/api/v1` |
| DB | Postgres on `:5433` (compose) | Postgres inside the Coolify stack |

- **All destructive testing happens locally.** Bring the stack up with `docker compose up -d`.
  Docker Desktop is usually **not** running — launch
  `C:\Program Files\Docker\Docker\Docker Desktop.exe` and wait for the engine first.
- The frontend runs through `preview_start`. Never run `npm run build` while the dev server is up —
  the production build overwrites `.next` and the dev server then serves blank pages with
  `Cannot find module './331.js'`.
- **Production writes are allowed only under the test account, and only when the playbook says so.**
  Clean up everything you create. Never touch the owner's own data.
- Deploys: push to `main` → GitHub webhook → Coolify. Confirm a deploy landed by polling
  `https://app.mynvoice.com/meta.json` until the version flips.
- **Cloudflare fronts every hostname.** A plain `curl` or `urllib` request from a script is answered
  with *error 1010*; use PowerShell `Invoke-WebRequest` or drive a real browser.

### 2. Accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| **Test account (default)** | `corcos+mynvoice@gmail.com` | `12345678` | exists locally **and** in production; use freely |
| **Owner / admin** | `acorcos@gmail.com` | *(owner's own)* | the only admin. **Never** test against its data |
| **Second account** | *create one* | — | **required for #1** — see below |

**Isolation testing needs two accounts.** MYNVOICE has no tenants: the boundary is `users.id`, and a
boundary cannot be tested from one side of it. Register a second account (`corcos+audit2@gmail.com`)
through the normal flow. **No SMTP is configured locally**, so no email is sent — read the token from
the database instead:

```bash
docker compose exec -T db psql -U mynvoice -d mynvoice -t -c \
  "SELECT email, verification_token FROM users ORDER BY created_at DESC LIMIT 3;"
```

Then `POST /auth/set-password {token, password}`. Give the second account its own company, clients,
invoices, items, expenses and payments — an isolation test proves nothing if the other side is empty.

### 3. Database access — the arbiter

```bash
docker compose exec -T db psql -U mynvoice -d mynvoice -c "<query>"
```

**SELECT only.** Every write goes through the API or the UI, never raw SQL — the point is to test the
application's guarantees, not the database's. Verify every claim **against the tables**, never against
the API's own summary numbers. A 200 that returns another account's row is CRITICAL; a rejection that
nevertheless mutated a row is also CRITICAL.

Production database, when a playbook genuinely needs it: Coolify → Terminal → the `backend` container,
then `python -m app.cli`. There is no direct psql from here.

### 4. Authentication — how to get a session

The session is an **`HttpOnly` cookie**, not a token. Two ways in:

- **As a browser** — `POST /auth/login`, keep the cookie jar, send `credentials: "include"`.
  State-changing requests need an `X-CSRF-Token` header whose value comes from `GET /auth/csrf`
  (**not** from `document.cookie` — see §6).
- **As a script** — the login response still returns `access_token` and `refresh_token` in the body,
  for clients with no cookie jar. `Authorization: Bearer <token>` works and is **exempt from CSRF**,
  which makes it the convenient path for API-level probing. Use the cookie path when the thing under
  test *is* the cookie or the CSRF behaviour.

Destructive admin actions additionally need a TOTP step-up (`X-Admin-Step-Up`). To drive them
programmatically: `/sys/totp/begin` → compute the code from the returned secret → `/sys/totp/confirm`,
and clear it afterwards with `python -m app.cli reset-totp <email>`.

### 5. Tools — use all three, cross-checked

- **API scripts** — the fastest way to enumerate and to fire malformed input. Mind §1: from the host,
  use PowerShell against production.
- **Playwright** — drive the real UI. It is the only tool that sees CSP violations, cookie scope,
  hydration errors and client-side redirects.
- **Database** — reconcile after every step; it is the arbiter.
- **Simulate every way you can** — normal paths, edge cases, malformed input, the wrong actor, another
  account's ids, mid-flow interruptions, concurrent duplicates. Be skeptical; try to break it.

### 6. Landmines this codebase has already stepped on

Re-probe these. Each one shipped to production at least once, and each is cheap to reintroduce.

- **localhost hides cross-origin bugs.** Locally the app and the API are both `localhost` — same site,
  cookies shared, ports ignored. In production they are `app.` and `api.`, different hosts. The CSRF
  token was read from `document.cookie`, which worked perfectly locally while **every write 403'd in
  production**. Anything touching cookies, CORS, CSRF or redirects must be re-verified against prod.
- **Middleware order is the reverse of how it reads.** Starlette makes the *last-registered* middleware
  **outermost**. A rejection raised outside `CORSMiddleware` carries no `Access-Control-Allow-Origin`,
  so the browser discards it and `fetch` rejects — the page then shows its catch-all message instead of
  the real error. Check that error responses are *readable from the page*, not merely correct on the wire.
- **Two proxies, not one.** Cloudflare sits in front of Traefik, so the last `X-Forwarded-For` entry is
  Cloudflare's edge, not the client. Anything keyed on client IP must use `CF-Connecting-IP`.
- **Money crosses the wire as JSON.** Decimals used to serialise as strings (`"840.00"`), which turned
  `a + b` into concatenation and `x > 0` into a NaN comparison. The `Money` type
  (`app/schemas/types.py`) fixes it at the source; every **new** decimal field must use it. Assert
  types, not only values.
- **An auth probe must not redirect.** A 401 answering "am I signed in?" is an answer, not a session
  death. Treating it as one threw every anonymous visitor off the landing page.
- **Invoice and payment numbers are derived, not counted.** They come from the highest existing number
  rather than `count(*) + 1`, which reused numbers after a deletion. Test delete-then-create.
- **A pending TOTP secret is reused on purpose.** `/sys/totp/begin` returns the same secret until it is
  confirmed; minting a new one per call silently killed the QR already in someone's authenticator.

### 7. Bug policy — MANDATORY

- **A plain error with no decision in it** — a crash, a wrong total, another account's data, an
  avoidable 500, an off-by-one, a broken reconciliation → **fix it automatically**: apply the fix, bump
  `frontend/package.json` **and** `frontend/public/meta.json` (see `docs/versioning.md`), push, wait for
  the deploy, and **re-run the exact test that caught it** to prove it is closed.
- **A bug that involves a technical decision, a product rule, or that could affect something else** →
  do **NOT** apply it. Set it aside with a concrete repro, a proposed fix and a severity, in a separate
  **"needs owner decision"** section to review at the end.
- **Anything that leaks one account's data to another is CRITICAL** and stops the run. Report it
  immediately rather than continuing to accumulate findings.
- Migrations must be idempotent. Leave nothing behind in production; locally, prefix test rows clearly
  (`ZZ-…`) so the owner can spot them.

### 8. Deliverable + record the run

Keep a running report in the scratchpad, then finish with: a **TL;DR**, a **verdict table** (every test
id: PASS / FAIL / BLOCKED), **findings** split into *fixed automatically (with version)* versus *needs
owner decision*, the **reconciliation evidence**, and **coverage gaps** — say plainly what you did not
get to. A run that reports "all clear" without saying what it did not reach is not finished.

Then copy the report to `result/<playbook>_<YYYY-MM-DD>.md` and append ONE row to
[`result/RUN_LOG.md`](result/RUN_LOG.md), newest first:

```
| 2026-08-25 | account-isolation | local | PASS · 2 fixed | [file](result/account_isolation_2026-08-25.md) |
```

---

## What each playbook guards (quick map)

- **The account boundary** — every id-taking endpoint scopes by `user_id`; no invoice, client, item,
  payment, expense, logo or PDF crosses between accounts; aggregates and reports never mix. **#1**
- **The books** — totals, tax, discount, `balance_due`, `amount_paid`; status transitions; invoice and
  payment numbers unique and never reused, including under concurrency; money typed as numbers. **#2**
- **The session** — cookie flags and scope, CSRF on every write, silent refresh, logout revocation,
  login and reset throttling, `is_admin` gating, TOTP step-up and replay, audit-log honesty. **#3**
- **The public surface** — headers, CORS, docs and schema, secrets in bundles, user enumeration, open
  redirects, the wildcard subdomains. **#4**
- **Everything hostile** — malformed and oversized payloads, injection, unicode, upload abuse, PDF and
  email as amplification vectors, pathological inputs and N+1. **#5**

---

## 🗄 Archive (historical, reference only)

| Report | Date | Note |
|---|---|---|
| [`unauth_blackbox_external_2026-07-30.md`](archive/unauth_blackbox_external_2026-07-30.md) | 2026-07-30 | External black-box assessment, with our verification and remediation appended. Two of its conclusions were wrong **in the reassuring direction** — read the appended section, not only the findings. Playbook **#4** is the repeatable version. |
