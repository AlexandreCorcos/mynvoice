# Black-box, unauthenticated public surface (SCOPE)

> **Read `docs/Audit/audit.md` § MANDATORY SHARED CONTEXT first.** This file is the **SCOPE**.
> **Mode:** 🔴 unauthenticated, **read-only, against production**. No login, no account creation, no
> brute-forcing, no load testing, no data modified. ≤5 probes per endpoint.

Act as an **external attacker with no account**, seeing only what the internet sees. The question is
narrow and worth answering honestly: **what can be learned or reached without credentials?**

An external assessment already ran this once — [`../archive/unauth_blackbox_external_2026-07-30.md`].
Read it **including the verification appended at the end**, because two of its conclusions were wrong
*in the reassuring direction*, and one real gap was outside its scope. That is the standing lesson of
this playbook: a black-box test can only report what it can see, and "not observed" is not "not
present".

---

## 0. Do not repeat the previous run's mistakes

- It reported *"session tokens are held in memory"* as a strength. They were in `localStorage` — the
  test never signed in, so it measured an empty store and read that as architecture. **Do not infer an
  implementation from an absence.** Say "not observed", and check the source if you have it.
- It rated CORS as a safe exact-match allowlist. The server also carried
  `allow_origin_regex=r"https?://.*\.mynvoice\.com"`, which accepted *any* subdomain with credentials.
  The two obvious probes (`evil.com`, `app.mynvoice.com.evil.com`) both correctly fail against a
  `fullmatch` regex, so from outside it looked exact. **Probe the shapes that would pass a permissive
  pattern**, not only the shapes that would fail a strict one.
- It could not test rate limiting because its scope forbade it. Note such gaps loudly rather than
  leaving a silent hole in the coverage table.

## 1. Headers, on every hostname

`mynvoice.com`, `www.`, `app.`, `api.`, and a made-up subdomain.

- `Content-Security-Policy` — record it in full and read it critically. `script-src` still carries
  `'unsafe-inline'` because Next inlines its bootstrap; confirm that is still the only reason, and that
  `connect-src`, `frame-ancestors`, `base-uri`, `form-action` and `object-src` are as intended.
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP.
- `Strict-Transport-Security` — max-age, `includeSubDomains`, `preload`.
- Fingerprinting: `x-powered-by` should be absent. Note `server` and any `x-nextjs-*`.
- Compare the hostnames against each other. A header present on one and missing on another means it
  comes from somewhere you have not accounted for.

## 2. What the API volunteers

- `/openapi.json`, `/docs`, `/redoc` — must be **404** in production. If any returns 200, the entire
  route map, every field name and every privileged path is public, and the finding is MEDIUM at least.
- `/health` — fine to be public; confirm it leaks no version, host or dependency detail.
- A 404 and a 422 body: no stack trace, no file path, no SQL, no framework internals.
- Unhandled input on a public route: does an error ever echo back something internal?

## 3. CORS — probe for permissiveness, not just for rejection

For each, record whether `Access-Control-Allow-Origin` comes back and whether
`Access-Control-Allow-Credentials: true` accompanies it:

```
https://app.mynvoice.com          → expected: echoed
https://evil.com                  → expected: none
https://app.mynvoice.com.evil.com → expected: none   (suffix attack)
https://appXmynvoice.com          → expected: none   (unescaped dot in a pattern)
https://staging.mynvoice.com      → expected: none   (arbitrary subdomain — this one used to pass)
http://app.mynvoice.com           → expected: none   (scheme downgrade)
null                              → expected: none
```

Credentialed CORS plus any pattern match is an account-data exposure. Test the preflight as well as the
simple request — they are handled separately.

## 4. Authentication surface, without authenticating

- **User enumeration**: login with a real address versus an invented one — identical message, and
  compare response *times* across several samples. Same for `/auth/forgot-password` and registration.
- `/auth/register` — does it disclose that an address already exists?
- The password-reset link carries its token in the query string. Confirm `Referrer-Policy` keeps the
  path out of cross-origin referrers, and that the page loads no third-party script that would see it.
- Reset tokens: length and shape (guessable? sequential?). **Do not brute-force** — inspect one and
  reason.
- Try an obviously invalid token: the error must not distinguish "no such token" from "expired".

## 5. Anything reachable without a session

- Every route in the router, unauthenticated. Expected: 401/403 with no body of substance. Any 200 is a
  finding unless it is deliberately public.
- `/admin/donations` is intentionally public (it feeds the donation bar) — confirm it exposes only the
  aggregate, and that the sibling write endpoint does not.
- `/sys/*` unauthenticated, every route.

## 6. The frontend bundle

- Source maps: `*.js.map` for the main, page and vendor chunks — expected 404.
- Grep the served JavaScript for `NEXT_PUBLIC_`, API keys, Sentry DSNs, Stripe/analytics tokens, an
  internal hostname or an IP. Only the API base URL should appear.
- Third-party script and connection hosts: expected only Google Fonts.
- `/_next/static/` and the other asset paths: no directory listing.

## 7. Common files and paths

`/.env`, `/.env.local`, `/.env.production`, `/.git/HEAD`, `/.git/config`, `/backup.zip`, `/dump.sql`,
`/config.json`, `/package.json`, `/server-status`, `/actuator`, `/.well-known/security.txt`
(this one **should** exist).

## 8. Redirects and methods

- Open redirect via `?next=`, `?redirect=`, `?return_to=`, `?url=`, `?continue=` on `/login` and `/`.
- HTTP → HTTPS redirects on every hostname.
- `TRACE`, and a `GET` on a POST-only route.
- Reflected/DOM XSS on the public pages: a payload in the path and in the query of `/`, `/login`,
  `/reset-password`. React escapes by default — you are looking for the place that does not.

## 9. DNS and the edge

- Does the wildcard still resolve? Try `staging.`, `admin.`, `dev.`, `backend.`, `portal.`, `cdn.` and
  a random label. Record what they serve — a subdomain that resolves to something you do not control is
  a takeover risk *and* an input to the CORS and cookie questions above.
- `storage.mynvoice.com` — are logo objects listable? Is a URL guessable?
- Minimum TLS version, and whether the origin is reachable directly, bypassing Cloudflare. If the
  origin IP is discoverable, every edge control above can be walked around — say so plainly.

## 10. The question to answer at the end

State it explicitly, as the previous report did:

> **Did you access any information that should require authentication?**

Answer yes or no, list precisely what unauthenticated data you did see, and — separately — list what
you **could not test** within this scope so the gap is visible rather than implied.
