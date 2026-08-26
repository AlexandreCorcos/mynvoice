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
| **1** | Cross-account isolation — does data leak between users? | [`playbooks/ACCOUNT_ISOLATION.md`](playbooks/ACCOUNT_ISOLATION.md) | **LOCAL → PROD** | 🔴 authenticated security — cross-boundary writes must be *blocked* |
| **2** | Money & invoice integrity | [`playbooks/MONEY_INVOICE_INTEGRITY.md`](playbooks/MONEY_INVOICE_INTEGRITY.md) | **LOCAL → PROD** | 🟠 read-write + concurrency |
| **3** | Session, CSRF, admin & step-up | [`playbooks/AUTH_SESSION_CSRF_ADMIN.md`](playbooks/AUTH_SESSION_CSRF_ADMIN.md) | **LOCAL → PROD** | 🔴 authenticated security |
| **4** | Black-box, unauthenticated public surface | [`playbooks/UNAUTH_BLACKBOX.md`](playbooks/UNAUTH_BLACKBOX.md) | **PROD** | 🔴 unauth — read-only, no login |
| **5** | Input robustness, uploads, PDF & email abuse | [`playbooks/INPUT_ROBUSTNESS.md`](playbooks/INPUT_ROBUSTNESS.md) | **LOCAL → PROD** *(partial — see §9)* | 🟠 read-write, hostile input |

> **Every playbook finishes in production.** Local is where you find things fast and break them
> safely; production is where the answer counts. Run the playbook locally first, then re-run it
> against production under the audit accounts, following **§9 PRODUCTION DISCIPLINE** — which is not
> optional and is the difference between an audit and an incident.
>
> A run that never reached production has **not** tested the thing that has actually broken here: the
> last three production defects all passed locally and failed live (§6).

---

## 🔒 MANDATORY SHARED CONTEXT — in force for every run

### 1. Environments — there is no staging

| | Local | Production |
|---|---|---|
| App | `http://localhost:3000` | `https://app.mynvoice.com` (also `mynvoice.com`, `www.`) |
| API | `http://localhost:8000/api/v1` | `https://api.mynvoice.com/api/v1` |
| DB | Postgres on `:5433` (compose) | Postgres inside the Coolify stack |

- **Local is the rehearsal, production is the answer.** Find and fix fast locally, then re-run the
  same tests against production under the audit accounts. Both halves are required; see **§9**.
- Bring the local stack up with `docker compose up -d`. Docker Desktop is usually **not** running —
  launch `C:\Program Files\Docker\Docker\Docker Desktop.exe` and wait for the engine first.
- The frontend runs through `preview_start`. Never run `npm run build` while the dev server is up —
  the production build overwrites `.next` and the dev server then serves blank pages with
  `Cannot find module './331.js'`.
- **In production you write only as the audit accounts, and you clean up.** The owner's own account
  and its data are off limits, always, for every playbook.
- Deploys: push to `main` → GitHub webhook → Coolify. Confirm a deploy landed by polling
  `https://app.mynvoice.com/meta.json` until the version flips.
- **Cloudflare fronts every hostname.** A plain `curl` or `urllib` request from a script is answered
  with *error 1010*; use PowerShell `Invoke-WebRequest` or drive a real browser.

### 2. Accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| **Test account (default)** | `corcos+mynvoice@gmail.com` | `12345678` | exists locally **and** in production; use freely |
| **Isolation account A** | `corcos+audit1@gmail.com` | `12345678` | exists **in production** (and can be made locally); furnish it |
| **Isolation account B** | `corcos+audit2@gmail.com` | `12345678` | exists **in production** (and can be made locally); furnish it |
| **Owner / admin** | `acorcos@gmail.com` | *(owner's own)* | the only admin. **Never** test against its data |

**Isolation testing needs two accounts.** MYNVOICE has no tenants: the boundary is `users.id`, and a
boundary cannot be tested from one side of it. Use **`corcos+audit1@`** and **`corcos+audit2@`** as the
two furnished accounts — they now exist **in production**, so the full A-vs-B matrix runs live (it used
to be a coverage gap). Locally, register `corcos+audit2@` the same way if you need a local pair.

In production the signup emails really are delivered, so use a real inbox alias and follow the link.
**Locally no SMTP is configured**, so no email is sent — read the token from the database instead:

```bash
docker compose exec -T db psql -U mynvoice -d mynvoice -t -c \
  "SELECT email, verification_token FROM users ORDER BY created_at DESC LIMIT 3;"
```

Then `POST /auth/set-password {token, password}`. Give the second account its own company, clients,
invoices, items, expenses and payments — an isolation test proves nothing if the other side is empty.

The audit accounts are **permanent fixtures in production**. There is no self-service account deletion,
so treat them as part of the furniture: keep their data recognisable (§9), and never create a third,
fourth and fifth one per run.

### 3. Database access — the arbiter

```bash
docker compose exec -T db psql -U mynvoice -d mynvoice -c "<query>"
```

**SELECT only.** Every write goes through the API or the UI, never raw SQL — the point is to test the
application's guarantees, not the database's. Verify every claim **against the tables**, never against
the API's own summary numbers. A 200 that returns another account's row is CRITICAL; a rejection that
nevertheless mutated a row is also CRITICAL.

**In production the database is still the arbiter**, and reaching it takes one more step: Coolify →
Terminal → the `backend` container. `python -m app.cli` covers the admin commands; for arbitrary
read-only queries, use the app's own session:

```python
python - <<'PY'
import asyncio
from sqlalchemy import text
from app.db.session import async_session

async def main():
    async with async_session() as db:
        rows = await db.execute(text("SELECT id, email FROM users ORDER BY created_at DESC LIMIT 5"))
        for r in rows: print(r)

asyncio.run(main())
PY
```

**SELECT only, in production above all.** Never mutate production data from a shell — if a test needs
a row changed, it goes through the API, which is the thing being tested anyway.

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
id: PASS / FAIL / BLOCKED, **with a column for local and a column for production**), **findings** split
into *fixed automatically (with version)* versus *needs owner decision*, the **reconciliation
evidence**, the **production cleanup confirmation** (§9), and **coverage gaps** — say plainly what you
did not get to, and which probes were deliberately kept out of production. A run that reports "all clear" without saying what it did not reach is not finished.

Then copy the report to `result/<playbook>_<YYYY-MM-DD>.md` and append ONE row to
[`result/RUN_LOG.md`](result/RUN_LOG.md), newest first:

```
| 2026-08-25 | account-isolation | local | PASS · 2 fixed | [file](result/account_isolation_2026-08-25.md) |
```

### 9. PRODUCTION DISCIPLINE — read before every production pass

Production holds a real person's books. Everything below is a hard rule, not advice.

**The owner's account is untouchable.** `acorcos@gmail.com` and its invoices, clients, revenue and
company are never a test target — not read as a probe, not listed, not messaged, not counted. If a
test needs "another user's data", that is what the second **audit** account is for. The one exception
is admin-panel behaviour that can only be exercised as an admin: use it to *act*, never as the
*subject*.

**Everything you create is labelled.** Prefix every row with `ZZ-AUDIT-` — client names, item names,
invoice references, expense descriptions, company names. One `LIKE 'ZZ-AUDIT-%'` must find all of it.
An unlabelled test row in production is indistinguishable from real data six months later.

**Inventory before and after.** Before the pass, record the row counts for the audit accounts. After
cleanup, they must match. Report any difference in the run report — including one you could not
resolve.

**Delete what you made, in dependency order** — payments, then invoices, then clients and items, then
expenses and categories. Verify by re-reading, not by trusting the 204.

**Never in production:**

| Forbidden | Why | Where it goes instead |
|---|---|---|
| Mass email — `/sys/message` to real recipients, invoice sends to addresses you don't own | Real delivery, real people, and a burnt SendGrid reputation is not recoverable in an afternoon | Local, where no SMTP is configured |
| Rate-limit exhaustion against any account but the audit ones | Locks a real person out of their own books | Local |
| Decompression bombs, 200-line PDF renders, pathological load | One small server, shared with the live app | Local |
| SSRF probes that reach *our* internal network | You may find it; you may also break something you cannot see | Local |
| Anything that writes via `psql` or the CLI | The application's guarantees are what is under test | Always the API |
| Deleting or deactivating accounts other than the audit ones | Obvious, and easy to do by a mis-typed id | — |

**Email in production, when a playbook genuinely needs it**: send only to an address you control
(`corcos+audit2@`), one message at a time, and say in the report exactly what was delivered.

**If something goes wrong, stop and say so immediately.** A half-cleaned production database is worth
interrupting the owner for; discovering it a week later is not.

**Every finding gets confirmed in production before it is reported.** A defect that reproduces only
locally is an environment difference, and saying which is part of the finding — the same is true in
reverse, and that reverse case is the whole reason this section exists (§6).

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
