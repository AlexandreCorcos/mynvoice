# Session, CSRF, admin & step-up (SCOPE)

> **Read `docs/Audit/audit.md` § MANDATORY SHARED CONTEXT first.** This file is the **SCOPE**.
> **Mode:** 🔴 authenticated security. **Local first, then production** (audit.md §9) — and here the
> production pass is not a formality: the local environment structurally cannot reproduce the
> conditions that broke this twice.

Act as a **senior application-security engineer** attacking the session itself: can it be stolen,
forged, replayed, kept alive after it should be dead, or used from somewhere it should not work? And
can an ordinary account reach the admin panel?

This surface is young. The session moved from `localStorage` to an `HttpOnly` cookie recently, CSRF was
added at the same time, and both shipped with a production-only defect. Treat every guarantee as
unproven.

---

## 1. The cookies themselves

Sign in and inspect all three (`mynv_session`, `mynv_refresh`, `mynv_csrf`).

- `mynv_session` and `mynv_refresh`: **`HttpOnly`**, `Secure` in production, `SameSite=Lax`.
- **Host-only** — no `Domain` attribute. `Domain=.mynvoice.com` would send the session to every
  subdomain, and DNS still resolves all of them to an unrelated site. Assert the attribute is absent,
  not merely that the value looks right.
- `mynv_refresh` scoped to `path=/api/v1/auth`; confirm it is **not** sent on a request to
  `/api/v1/invoices/` (read the request headers, do not infer).
- `document.cookie` from the app origin must expose **only** `mynv_csrf` locally and **nothing** in
  production. Both are correct; know which you are looking at.
- Lifetimes match the configured token lifetimes. An access cookie outliving its JWT means a user who
  looks signed in and is not.

## 2. CSRF

- Every state-changing method (`POST`, `PUT`, `PATCH`, `DELETE`) on a cookie-authenticated request
  requires `X-CSRF-Token`. Enumerate the routes from the router and try each **without** the header —
  any that succeeds is a hole.
- A **wrong** token, an **empty** token, a token from a **different session**, and a token from a
  previous session after re-login.
- The exempt list (`app/core/csrf.py`) is deliberately short. Read it and challenge every entry: does
  each one genuinely act without an existing session, or was it exempted for convenience?
- `Authorization: Bearer` requests are exempt by design — confirm that a request carrying **both** a
  session cookie and a bearer header cannot use the header to skip the CSRF check on a
  cookie-authenticated action.
- **The rejection must be readable from the page.** A 403 raised outside the CORS layer arrives with no
  `Access-Control-Allow-Origin`, the browser discards it, `fetch` rejects, and the UI shows an
  unrelated message. Assert `Access-Control-Allow-Origin` **is present on the 403 itself**, and that
  Playwright can read the body. This exact failure shipped.
- Multipart upload (`/profile/company/logo`) — same rules, different code path.

## 3. Session lifecycle

- **Silent refresh:** delete only `mynv_session`, keep `mynv_refresh`, then act. Expect
  `401 → POST /auth/refresh → 200` and no visible interruption.
- **Refresh rotation:** does refreshing issue a new refresh token? If so, is the old one still
  accepted? A reused old refresh token should ideally be refused; if it is not, that is a finding to
  raise as a decision, not to fix silently.
- Token **type confusion**: a refresh token used as an access token, and the reverse.
- **Tamper**: flip `sub` to another user's id and re-sign with a guessed key; strip the signature;
  set `alg: none`. All must 401.
- **Expiry**: mint a token that expired a second ago. Wait out a real access-cookie expiry and confirm
  the app recovers rather than logging the user out.
- **Logout** clears all three cookies server-side, and the session cannot be used afterwards — verify
  by replaying a captured request, not by observing the UI.
- Does anything still write a token to `localStorage` or `sessionStorage`? There should be nothing;
  the app also purges the pre-cookie leftovers on load.

## 4. Rate limiting

Two mechanisms, and they fail differently (`app/core/ratelimit.py`).

- **Per address, in memory.** Confirm the limit exists on `/auth/login` and `/auth/forgot-password`.
  Remember production runs four uvicorn workers, so the real allowance is roughly four times the number
  in the code — check the documented number is the honest one.
- **Per account, in the database.** Six wrong passwords from *rotating* addresses must lock the
  account; a correct password during the lock must also be refused; a successful sign-in must reset
  both counters.
- **The key must be the client, not the proxy.** Cloudflare sits in front of Traefik, so the last
  `X-Forwarded-For` entry is Cloudflare's edge. Send a forged `X-Forwarded-For` and confirm the limit
  key does not move. Confirm `CF-Connecting-IP` is preferred where present.
- Lockout as a denial-of-service: can an attacker lock a known user out at will? The lock is short on
  purpose — verify it actually is.
- `/auth/forgot-password` per recipient: the same address cannot be mail-bombed.

## 5. Admin — `is_admin`

- As an ordinary account, every `/sys/*` route must **403** from the API, independently of the
  frontend guard. The panel's redirect is a courtesy, not a control.
- `is_admin` must not be settable through any profile or registration payload (mass assignment).
- Self-protection: an admin cannot demote or deactivate themselves, and the last admin cannot be
  removed — through the API, not only through the CLI.
- `/sys/users` returns every account's email, name and revenue. Treat one missing guard there as the
  whole user base and test it accordingly.

## 6. TOTP step-up

Guards the four actions that cannot be taken back (`app/core/stepup.py`).

- Each guarded action without a step-up → `403 totp_required`; without enrolment →
  `403 totp_enrolment_required`. Both are 403 on purpose: a 401 would send the API client into its
  "session is dead" path and sign the admin out mid-action. Confirm they are still 403.
- **Replay:** the same six digits twice — the second must fail, inside the same 30-second window.
- **Window binding:** a step-up token obtained in browser 1 must not work from browser 2, even with a
  valid session. Only the SHA-256 is stored; confirm the plain value is nowhere in the database.
- **Expiry:** the window really ends after five minutes.
- **Throttle:** five wrong codes then a lockout — and be precise about what that buys with four
  workers.
- `/sys/totp/begin` **reuses** a pending secret; only `?reset=true` mints a new one. Call it twice and
  confirm the first QR still confirms — minting per call silently killed the code already in someone's
  authenticator.
- Disabling TOTP is itself a step-up action. The only way back from a lost authenticator is
  `python -m app.cli reset-totp` — confirm there is no API path that clears it.

## 7. Production re-verification — the point of this playbook

Everything above except the destructive parts must be re-run against **production**, with the audit
accounts, because **local cannot reproduce the conditions that broke this twice**:

- locally the app and the API are the same host, so cookie scope is not exercised;
- locally there is no Cloudflare, so proxy-derived client IPs are not exercised;
- locally `Secure` cookies are off, so their behaviour over HTTPS is not exercised.

At minimum, in production: sign in, confirm `document.cookie` cannot see the session, `GET /auth/csrf`
returns a token, **a real write succeeds**, a write without the header returns a *readable* 403, and
logout revokes. Clean up anything created.

Also production-only, because they do not exist locally:

- **`Secure` cookie behaviour over real HTTPS**, and whether anything breaks on an http→https hop.
- **Rate-limit keying behind Cloudflare** — send a forged `X-Forwarded-For` from a real browser and
  confirm the limit key does not move. Do this **only against an audit account** (audit.md §9):
  exhausting a limit keyed on a shared Cloudflare edge would affect real users.
- **The four-worker reality.** The in-memory throttle is per process, so the production allowance is
  roughly four times the number in the code. Measure it rather than repeating the number.

> A run of this playbook that never touched production has not tested the thing that has actually
> broken. Say so explicitly in the coverage-gaps section if you skip it.

## 8. Audit log honesty

Every privileged action writes an `AdminAuditLog` row.

- Each guarded action produces exactly one row, with the right actor, target and time.
- A **failed** action must not write a success row.
- Emails are copied into the row rather than joined, so the trail survives a deleted account — confirm
  by deleting a target and re-reading the log.
- The log must not be editable or deletable through the API.
