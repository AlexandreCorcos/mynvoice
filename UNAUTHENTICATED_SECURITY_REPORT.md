# Unauthenticated Black-Box Security Assessment — mynvoice.com

**Target:** `mynvoice.com`, `app.mynvoice.com`, `api.mynvoice.com`
**Test profile:** External, fully unauthenticated visitor. No accounts created, no login, no
credential/token/ID brute-forcing, no data modified, no DoS, ≤5 probes per endpoint.
**Date:** 2026-07-30
**Authorisation:** Testing explicitly authorised by the domain owner.

---

## Executive summary

The application has a **strong core security posture**. Every data-bearing API endpoint requires
authentication and returns `403 Not authenticated` when unauthenticated; there is **no user
enumeration** on login or password reset; **no secrets** (Sentry DSN, Stripe/Mapbox/analytics
tokens) are present in the JavaScript bundles; **no source maps** are served; CORS is correctly
scoped to the app origin; session tokens are held **in memory** (nothing in cookies, `localStorage`
or `sessionStorage`); and error responses leak **no stack traces or internal paths**.

No information that requires authentication was accessed at any point.

The findings below are **hardening gaps**, not breaches. The most material items are the publicly
exposed API documentation / OpenAPI schema (`MEDIUM`) and the absence of clickjacking and
Content-Security-Policy headers on the frontend (`MEDIUM`).

---

## Findings

### F-01 — Public API documentation and full OpenAPI schema exposed
- **Severity:** MEDIUM
- **Affected:** `https://api.mynvoice.com/docs`, `/redoc`, `/openapi.json`
- **What was publicly accessible:** The interactive Swagger UI (`/docs`), ReDoc (`/redoc`) and the
  complete machine-readable schema (`/openapi.json`, ~78 KB) are served to anyone. The schema
  enumerates **all 47 endpoints**, their methods, request/response models, field names and which
  routes require auth — including the admin/`sys` surface (`/api/v1/sys/users`,
  `/sys/users/{id}/toggle-admin`, `/sys/users/{id}/send-reset`, `/sys/totp/*`, `/admin/metrics`).
- **Reproduction:**
  1. Open `https://api.mynvoice.com/docs` in a clean browser → Swagger UI renders.
  2. `curl https://api.mynvoice.com/openapi.json` → full schema (`{"openapi":"3.1.0","info":{"title":"MYNVOICE","version":"0.1.0"},"paths":{ … 47 paths … }}`).
- **Redacted evidence:**
  ```
  GET /openapi.json  -> 200 application/json  (79694 bytes)
  GET /docs          -> 200 text/html
  GET /redoc         -> 200 text/html
  ```
- **Security impact:** Hands an attacker a complete, authoritative map of the attack surface,
  privileged admin routes, exact parameter names (useful for mass-assignment/IDOR probing) and the
  backend framework (FastAPI). It removes the reconnaissance cost of an attack.
- **Recommended fix:** Disable the docs and schema in production (FastAPI:
  `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)`), or gate them behind authentication /
  an allowlisted internal network. Keep them enabled only in non-production environments.

---

### F-02 — No clickjacking protection (missing `X-Frame-Options` / CSP `frame-ancestors`)
- **Severity:** MEDIUM
- **Affected:** `https://mynvoice.com/*`, `https://app.mynvoice.com/*` (incl. `/login`, `/reset-password`)
- **What was publicly accessible:** Frontend responses set **no** `X-Frame-Options` and **no**
  `Content-Security-Policy` with a `frame-ancestors` directive. The login and password-reset pages
  can be embedded in an attacker-controlled `<iframe>`.
- **Reproduction:**
  ```
  curl -sSD - -o /dev/null https://app.mynvoice.com/login | grep -iE 'x-frame-options|content-security-policy'
  -> (no output; neither header present)
  ```
- **Security impact:** Enables clickjacking / UI-redress against authenticated users — e.g. tricking
  a signed-in user into clicking framed controls, or overlaying a fake password field over the real
  reset page.
- **Recommended fix:** Add `X-Frame-Options: DENY` (or `SAMEORIGIN` if framing is needed) and a CSP
  containing `frame-ancestors 'none'`. These can be set at the Cloudflare edge (Transform Rules /
  Response Header) or in `next.config.js` `headers()`.

---

### F-03 — No Content-Security-Policy
- **Severity:** MEDIUM
- **Affected:** `https://mynvoice.com/*`, `https://app.mynvoice.com/*`
- **What was publicly accessible:** No `Content-Security-Policy` (or `-Report-Only`) header on any
  frontend response.
- **Reproduction:** `curl -sSD - -o /dev/null https://app.mynvoice.com/ | grep -i content-security-policy` → no output.
- **Security impact:** Removes the primary defence-in-depth control against XSS and data
  exfiltration. No reflected/DOM XSS was found in this test (React escapes output), but a single
  future injection or a compromised dependency would have no CSP to contain it.
- **Recommended fix:** Deploy a CSP scoped to the app's real dependencies (self + `fonts.googleapis.com`
  / `fonts.gstatic.com` + `api.mynvoice.com` in `connect-src`), starting in `Report-Only` to tune,
  then enforce. Include `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`.

---

### F-04 — Missing hardening headers: `Referrer-Policy`, `Permissions-Policy`, COOP/COEP
- **Severity:** LOW
- **Affected:** `https://mynvoice.com/*`, `https://app.mynvoice.com/*`
- **What was publicly accessible:** None of `Referrer-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` are set.
- **Reproduction:** header grep on any frontend response returns none of the above.
- **Security impact:** Without an explicit `Referrer-Policy`, cross-origin referrer leakage relies on
  the browser default (see F-08). No `Permissions-Policy` means powerful features
  (camera/geolocation/etc.) are not explicitly denied. Missing COOP/COEP weakens cross-origin
  isolation.
- **Recommended fix:** Add `Referrer-Policy: strict-origin-when-cross-origin` (or `no-referrer`),
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, and
  `Cross-Origin-Opener-Policy: same-origin`.

---

### F-05 — Technology/stack disclosure via response headers
- **Severity:** LOW
- **Affected:** `https://mynvoice.com/*`, `https://app.mynvoice.com/*`
- **What was publicly accessible:** `x-powered-by: Next.js` plus `x-nextjs-cache`,
  `x-nextjs-prerender`, `x-nextjs-stale-time` headers. The API additionally fingerprints as FastAPI
  via `/docs` and its Pydantic-style `422` validation errors.
- **Reproduction:** `curl -sSD - -o /dev/null https://mynvoice.com/ | grep -i 'x-powered-by\|x-nextjs'`.
- **Security impact:** Low on its own — it narrows an attacker's search for framework-specific CVEs.
  No version numbers are disclosed (good).
- **Recommended fix:** Remove `x-powered-by` (`poweredByHeader: false` in `next.config.js`). The
  `x-nextjs-*` cache headers are low-value externally and can be stripped at the edge.

---

### F-06 — HSTS `max-age` below one year, no `preload`
- **Severity:** LOW
- **Affected:** `mynvoice.com`, `app.mynvoice.com`, `api.mynvoice.com`
- **What was publicly accessible:** `Strict-Transport-Security: max-age=15552000; includeSubDomains`
  (180 days). `includeSubDomains` is present (good); `preload` is absent and the max-age is below the
  1-year / `preload`-eligible threshold.
- **Reproduction:** `curl -sSD - -o /dev/null https://mynvoice.com/ | grep -i strict-transport`.
- **Security impact:** A shorter window slightly widens the opportunity for SSL-strip on a first/again
  visit after expiry. Low, given HTTP already 301-redirects to HTTPS.
- **Recommended fix:** Raise to `max-age=31536000; includeSubDomains; preload` and submit to the HSTS
  preload list once confident all subdomains are HTTPS-only.

---

### F-07 — No `security.txt`
- **Severity:** LOW
- **Affected:** `https://mynvoice.com/.well-known/security.txt` (404)
- **What was publicly accessible:** No vulnerability-disclosure contact file.
- **Reproduction:** `curl -sI https://mynvoice.com/.well-known/security.txt` → `404`.
- **Security impact:** No standard channel for researchers to report issues; slows good-faith
  disclosure.
- **Recommended fix:** Publish `/.well-known/security.txt` (RFC 9116) with `Contact:`, `Expires:` and
  optionally `Policy:` fields.

---

### F-08 — Password-reset token carried in URL query string (with no `Referrer-Policy`)
- **Severity:** LOW
- **Affected:** `https://app.mynvoice.com/reset-password?token=…`
- **What was publicly accessible:** The reset flow places the token in the query string. The
  reset-password page loads cross-origin Google Fonts and sets no `Referrer-Policy`.
- **Reproduction:** Open the reset page with any token value; observe `?token=` in `location.href`;
  no `Referrer-Policy` header on the response.
- **Security impact:** URL-borne secrets are more prone to leaking via browser history, referrer
  headers, and logs than POST bodies. Impact is contained here because (a) modern browsers default to
  `strict-origin-when-cross-origin`, so the full path is *not* sent to `fonts.gstatic.com`, and
  (b) no third-party analytics/JS runs on the page. It becomes higher-impact if a `Referrer-Policy`
  weaker than the default is ever set, or a third-party script is added.
- **Recommended fix:** Set an explicit `Referrer-Policy` (F-04); ensure reset links are single-use and
  short-lived; consider a `no-referrer` policy specifically on the reset route.

---

### F-09 — Wildcard subdomain resolution serves a fallback site
- **Severity:** INFO
- **Affected:** `admin.`, `staging.`, `dev.`, `dashboard.`, `portal.`, `cdn.`, `backend.`,
  `static.mynvoice.com` (and any other undefined label)
- **What was publicly accessible:** Every undefined subdomain resolves and returns `200`, serving an
  unrelated personal portfolio page (`<title>ACORCOS — Software Engineering, AI & Automation</title>`,
  identical 67,203-byte body across all of them). Only `mynvoice.com`/`www` (landing),
  `app.` (SPA) and `api.` (FastAPI backend) are real application hosts. **No staging/dev application
  environment is exposed.**
- **Reproduction:** `curl -s https://staging.mynvoice.com/ | grep -i '<title>'` → the ACORCOS
  portfolio title, byte-identical to `dev.`, `admin.`, `backend.`, etc.
- **Security impact:** Currently benign (it serves a live third-party site, not an internal
  environment). Worth noting because a permissive wildcard (a) can lend credibility to phishing hosts
  like `login.mynvoice.com`, and (b) becomes a **subdomain-takeover** risk if the wildcard ever points
  at a de-provisioned service. *Not exploited — reported only, per scope.*
- **Recommended fix:** Replace the catch-all with explicit records for `app`/`api`/`www` and return
  `NXDOMAIN`/`404` for everything else, or point the wildcard at a controlled "no such site" page.

---

### F-10 — CORS returns `Access-Control-Allow-Credentials: true` on all responses
- **Severity:** INFO (not exploitable as configured)
- **Affected:** `https://api.mynvoice.com/*`
- **What was publicly accessible:** `Access-Control-Allow-Credentials: true` is present on every
  response, **but** `Access-Control-Allow-Origin` is reflected **only** for the exact origin
  `https://app.mynvoice.com`. An arbitrary `Origin: https://evil.com` receives **no**
  `Access-Control-Allow-Origin`, so browsers block the cross-origin read.
- **Reproduction:**
  ```
  curl -sSD - -o /dev/null -H 'Origin: https://evil.com'          https://api.mynvoice.com/health | grep -i access-control-allow-origin   -> (none)
  curl -sSD - -o /dev/null -H 'Origin: https://app.mynvoice.com'  https://api.mynvoice.com/health | grep -i access-control-allow-origin   -> https://app.mynvoice.com
  ```
- **Security impact:** None as currently configured — the allowlist is exact-match. Flagged so it is
  not loosened later (e.g. to a regex/suffix match) without care, which would turn credentialed CORS
  into an account-data exposure.
- **Recommended fix:** Keep the exact-origin allowlist. Avoid wildcard or suffix matching on
  `Origin`. Confirm `app.mynvoice.com.evil.com`-style origins are never matched.

---

### F-11 — Public donation-progress endpoint returns aggregate data unauthenticated
- **Severity:** INFO (by design)
- **Affected:** `GET https://api.mynvoice.com/api/v1/admin/donations`
- **What was publicly accessible:** `{"monthly_target":"400.00","current_month_total":"0.00","percentage":0.0,"currency":"GBP","message":null}`
- **Security impact:** None — this feeds the public donation progress bar and exposes only a
  non-sensitive aggregate. The sibling write endpoint (`PUT /admin/donations/config`) correctly
  requires auth. Noted only to confirm it is intentional.
- **Recommended fix:** No change required. Consider moving it out of the `/admin/` path prefix to
  avoid confusion, since it is a public endpoint.

---

## Checks Passed (tested, no finding)

| Area | Check | Result |
|---|---|---|
| Info disclosure | `/.env`, `/.env.local`, `/.env.production` | 404 — not exposed |
| Info disclosure | `/.git/HEAD`, `/.git/config` | 404 — not exposed |
| Info disclosure | `/backup.zip`, `/dump.sql`, `/config.json`, `/package.json` | 404 — not exposed |
| Info disclosure | `/phpinfo.php`, `/server-status`, `/actuator*` | 404 — not present |
| Source maps | `*.js.map` for main/page/vendor bundles | 404 — not served |
| Secrets in JS | Sentry DSN, Stripe/Mapbox/analytics/Segment/GA tokens, API keys, `NEXT_PUBLIC_*` | None found (only expected `api.mynvoice.com/api/v1` base URL) |
| Third-party JS | External script/data hosts beyond Google Fonts | None (no trackers, no mixed content) |
| AuthZ | `/profile/me`, `/sys/users`, `/sys/metrics`, `/invoices/`, `/admin/metrics` unauthenticated | `403 Not authenticated` — no data leak |
| Auth enumeration | Login wrong-email vs wrong-password message | Generic `"Invalid email or password"` — no enumeration |
| Auth enumeration | `forgot-password` existing vs non-existing email | Generic `"If an account exists…"` message; no clear timing signal |
| Session storage | Cookies / `localStorage` / `sessionStorage` on cold load | Empty — JWT held in memory only |
| CORS | Arbitrary `Origin` reflection | Not reflected — scoped to `app.mynvoice.com` |
| XSS (reflected/DOM) | Payload in path + query on `/reset-password`, `/login` | Escaped by React — not injected into DOM |
| Open redirect | `?next=`, `?redirect=`, `?return_to=`, `?url=`, `?continue=` on `/login` | No server-side external redirect |
| AuthN routing | `/dashboard` unauthenticated | 302 → `/login`, renders no data |
| Error handling | Malformed JSON / wrong types to API | Clean `422` validation errors; no stack trace or internal paths |
| HTTP methods | `TRACE`, and `GET` on POST-only routes | `405` — disabled / rejected |
| Transport | HTTP → HTTPS | `301` redirect to HTTPS |
| Transport | TLS 1.2 handshake + certificate | TLS 1.2 OK; valid Let's Encrypt cert, CN=`mynvoice.com`, ~90-day validity |
| Directory listing | `/assets/`, `/static/`, `/uploads/`, `/files/`, `/media/`, `/public/`, `/_next/static/` | `308` normalise, no listing |
| Headers | `X-Content-Type-Options: nosniff` | Present |
| Subdomains | `staging.`, `dev.`, `admin.`, `backend.` for exposed environments | None — wildcard fallback to unrelated site (see F-09) |
| MITM | `TRACE` cross-site tracing | Disabled |

> **Note on legacy TLS:** Whether TLS 1.0/1.1 are accepted by the Cloudflare edge could **not be
> confirmed** from the test client (its local OpenSSL/curl enforce a TLS 1.2 floor). Recommend
> confirming the Cloudflare "Minimum TLS Version" is set to **1.2** in the dashboard.

---

## Summary table

| ID | Severity | Title | Status |
|---|---|---|---|
| F-01 | MEDIUM | Public API docs & full OpenAPI schema exposed (`/docs`, `/redoc`, `/openapi.json`) | Open |
| F-02 | MEDIUM | No clickjacking protection (`X-Frame-Options` / CSP `frame-ancestors`) | Open |
| F-03 | MEDIUM | No Content-Security-Policy | Open |
| F-04 | LOW | Missing `Referrer-Policy`, `Permissions-Policy`, COOP/COEP | Open |
| F-05 | LOW | Stack disclosure via `x-powered-by` / `x-nextjs-*` headers | Open |
| F-06 | LOW | HSTS `max-age` < 1 year, no `preload` | Open |
| F-07 | LOW | No `/.well-known/security.txt` | Open |
| F-08 | LOW | Password-reset token in URL query string (no `Referrer-Policy`) | Open |
| F-09 | INFO | Wildcard subdomains serve a fallback site | Open |
| F-10 | INFO | Credentialed CORS globally, origin correctly allowlisted (not exploitable) | Open |
| F-11 | INFO | Public donation-progress endpoint (by design) | Open |

---

## Did you successfully access any information that should require authentication?

**NO.** Every authenticated endpoint returned `403 Not authenticated`; no user, invoice, client,
expense, payment, admin or session data was accessed. The only unauthenticated data observed was
intended-public (the donation progress aggregate and the health check) and self-disclosed API
metadata (the OpenAPI schema). No accounts were created, no credentials/tokens/IDs were
brute-forced, and no data was modified or deleted.

---

### Suggested remediation priority
1. **F-01** — disable `/docs`, `/redoc`, `/openapi.json` in production.
2. **F-02 + F-03** — add `X-Frame-Options`/`frame-ancestors` and a `Content-Security-Policy` (start in Report-Only). Both can be shipped together at the Cloudflare edge.
3. **F-04–F-08** — batch the remaining header hardening (`Referrer-Policy`, `Permissions-Policy`, COOP, HSTS bump, remove `x-powered-by`) plus `security.txt`.
4. **F-09** — tighten wildcard DNS; re-check periodically for dangling records.

---

# Verification & remediation — 2026-07-31

Every finding was re-checked against the code and against production before
being actioned. The report was accurate on everything it could observe: byte
counts, status codes and absent headers all reproduced exactly.

Two of its conclusions were wrong, both in the reassuring direction, and one
real gap fell outside its scope.

## Corrections to the report

**F-10 was under-rated: CORS was not an exact-match allowlist.** The report
concluded "reflected only for the exact origin … not exploitable as
configured" and recommended keeping it that way. The backend in fact carried

```python
allow_origin_regex=r"https?://.*\.mynvoice\.com"   # alongside allow_credentials=True
```

Confirmed against production before the fix: `https://staging.mynvoice.com`,
`https://anything-i-want.mynvoice.com` and `http://attacker.mynvoice.com` were
all echoed back in `Access-Control-Allow-Origin` with credentials allowed.

A black-box test cannot see this. Starlette matches the pattern with
`fullmatch`, so the two probes anyone would try — `evil.com` and
`app.mynvoice.com.evil.com` — both correctly fail, and the policy looks exact
from outside.

Read together with F-09 (DNS resolves every label under the domain) this was a
chain, not two INFO items: one subdomain takeover, or one attacker answering
for `http://anything.mynvoice.com` on a shared network, and authenticated API
responses become readable.

**The executive summary's "session tokens are held in memory" is false.**
Tokens are written to `localStorage` (`frontend/src/lib/api.ts`,
`frontend/src/contexts/auth-context.tsx`). The test was entirely
unauthenticated, so it observed an empty store and read that as an
architectural property. It measured the absence of a session, not the shape of
one.

This matters because that premise makes F-03 look like defence-in-depth. With
tokens readable by any script and no CSP, a single XSS is full account
takeover. F-03 was more serious than its own report implied.

## Gap outside the report's scope

**Nothing was rate limited.** The scope forbade brute-forcing, so this could
not be tested. `/auth/login` accepted unlimited guesses and
`/auth/forgot-password` would send a real email to any address on demand.

## Status

| ID | Finding | Status |
|---|---|---|
| F-01 | Public API docs & OpenAPI schema | **Fixed** — gated on `DEBUG`; `/docs`, `/redoc`, `/openapi.json` now 404 in production |
| F-02 | No clickjacking protection | **Fixed** — `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| F-03 | No Content-Security-Policy | **Fixed, with a caveat** — see below |
| F-04 | Missing `Referrer-Policy`, `Permissions-Policy`, COOP | **Fixed** |
| F-05 | Stack disclosure via `x-powered-by` | **Fixed** — `poweredByHeader: false`. The `x-nextjs-*` cache headers remain; strip at the edge if wanted |
| F-06 | HSTS below one year, no preload | **Open — needs Cloudflare** |
| F-07 | No `security.txt` | **Fixed** — plus a `SECURITY.md` policy |
| F-08 | Reset token in query string | **Mitigated** — explicit `Referrer-Policy`; links stay single-use and 24h |
| F-09 | Wildcard subdomains | **Open — needs Cloudflare.** Its worst consequence is closed by the CORS fix |
| F-10 | Credentialed CORS | **Fixed** — regex removed, exact list only. Re-verified in production |
| F-11 | Public donation endpoint | No change — intended |
| — | No rate limiting *(not in report)* | **Fixed** — per-address and per-account limits on login, per-address and per-recipient on password reset |

Headers verified live on `https://app.mynvoice.com/login` after deploy.

### The CSP caveat

`script-src` still carries `'unsafe-inline'`, because Next inlines its own
hydration bootstrap and flight payload. Removing it requires per-request
nonces, which would make every page dynamic — the landing page would stop
being statically served. That is a real trade-off and is deliberately left as
a decision rather than made silently.

What the policy does buy: `connect-src` limits where a stolen token could be
sent to our own API, no attacker-hosted script can load, and `base-uri` /
`form-action` stop a `<base>` tag or a rewritten form redirecting credentials
elsewhere.

### Still open, by choice

**Access tokens in `localStorage`.** The real fix is `httpOnly` cookies, which
touches login, refresh, the API client and CSRF handling. An auth refactor,
not hardening — pending a decision.

**Cloudflare-side items (F-06, F-09)** and confirming Minimum TLS Version 1.2.
