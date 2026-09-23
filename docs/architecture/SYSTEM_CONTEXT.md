# SYSTEM_CONTEXT.md — what MYNVOICE is

The architecture, invariants and gotchas of the app. Read this before sensitive work; **every
subagent reads it first**, because subagents see neither memory nor this session's context. The
operating rules (how work is done) live in [`AI_RULES.md`](../../AI_RULES.md); this file is the
system itself.

## Overview

**MYNVOICE** is an open-source, free invoice and expense management system for small businesses,
freelancers and the self-employed. The goal is a modern, elegant UX — not a generic SaaS tool.
Slogan: *"Your business. Your invoices."*

```
/backend      # Python + FastAPI + SQLAlchemy 2 async + Pydantic v2 + Alembic + Postgres
/frontend     # Next.js 15 + React 19 + TailwindCSS 4 + Framer Motion + dnd-kit
/docs         # Documentation
/examples     # UI reference screenshots (inspiration only, do not copy)
```

## The one invariant: account isolation

Single-tenant. No organisations, no teams. `users.id` is the **only** boundary and it is enforced
by hand in every query — there is no framework guarantee. This is rule **R4**; its detail is
`docs/rules/R04-account-isolation.md`. Owned models: `Client`, `Company`, `Invoice`, `Item`,
`Payment`, `Expense`, `ExpenseCategory`, `AccountingPeriod`, `TransactionItem`. Foreign references
in a body go through `assert_owned` (`app/api/deps.py`); a foreign id → 404.

## Sessions

The session is an **`HttpOnly` cookie** set by the API, not a token in `localStorage`. Nothing in
the frontend reads or stores a token.

- Every request needs `credentials: "include"`; the API is a different origin. `lib/api.ts` does
  this centrally — use `api.*`, not bare `fetch` (`api.raw` for non-JSON like the PDF).
- **Signing out is a request.** Only the server can delete a cookie it marked `HttpOnly`.
- State-changing requests carry `X-CSRF-Token`, from `GET /auth/csrf`, held in memory by
  `lib/api.ts` — **not** read from `document.cookie` (the cookie is on the API's hostname, invisible
  to the app's origin; on localhost both are the same host, which hides the distinction).
- The CSRF middleware is registered **before** CORS so it runs *inside* it. Starlette makes the
  last-registered middleware outermost; a rejection raised outside CORS carries no
  `Access-Control-Allow-Origin`, so the browser discards it and the page shows its catch-all.
- The cookie is **host-only on the API's hostname**. Never `Domain=.mynvoice.com` — DNS resolves
  every subdomain, so that would hand the session to anything squatting on one. Guarded by
  `tests/guards/test_session_cookie_host_only.py`.

`app/core/cookies.py` and `app/core/csrf.py` hold the whole of it. The API still accepts
`Authorization: Bearer` for clients with no cookie jar.

## Admin access

`/sys/ctrl` and `/api/v1/sys/*` use the ordinary bearer token plus `is_admin`. There is no
separate admin password. Admin is granted on the server only:

```
docker compose exec backend python -m app.cli grant-admin you@example.com
```

Every privileged action writes an `AdminAuditLog` row. You cannot demote or deactivate yourself,
and the last admin cannot be removed. Presence from `users.last_seen_at`, stamped at most once a
minute in `get_current_user`. The three hard-to-reverse actions (grant admin, deactivate, force
password reset) need a TOTP step-up (`require_step_up` in `deps.py`, `app/core/stepup.py`); a code
opens a five-minute window bound to the browser via `X-Admin-Step-Up`, held in React state, never
`localStorage`. Frontend: `components/app/step-up.tsx`. Full detail: `docs/admin-access.md`.

## File storage

Uploads live in Cloudflare R2 (`storage.mynvoice.com`); **public access is off on purpose** — it
holds original PDFs of imported invoices and company logos, carrying client names, amounts and
bank details. Every read goes through the API.

- **Logos are fetched, not linked.** `GET /profile/company/logo` streams the bytes behind the
  session; the frontend makes an object URL via `hooks/useCompanyLogo.ts`. An
  `<img src={company.logo_url}>` renders broken — the stored URL answers 401.
- **PDFs inline the logo as a `data:` URI** so WeasyPrint makes no outbound request (the allowlist
  in `_safe_url_fetcher` constrains what it may fetch).
- `upload_file` records a public-style URL; map back with `storage.key_from_url()` then
  `storage.download_file()`. Re-uploading does not change any of this.

## Importing invoices issued elsewhere

Invoices raised in another system carry numbers already printed on documents a client holds, so
they come in as they stand. `POST /invoices` has no `invoice_number` field — numbers are derived,
never chosen. The one path that sets them is server-side:

```
docker compose exec backend python -m app.cli import-invoices <manifest.json> --commit
```

It refuses the whole run if any invoice's items disagree with the printed total, skips numbers
already in the account, and stores the PDF as issued (the generator would print today's company
profile onto a historical record). Number shape is configurable per client and per company:
`{prefix}{separator}{number:0{padding}d}`. Counters only move forward. See
`docs/importing-invoices.md`.

## Design system — Graphite & Brass

A warm-graphite neutral axis plus **one** chromatic (brass). Elegance comes from restraint. Never
introduce a second accent hue. All tokens live in `frontend/src/app/globals.css`, defined twice —
`:root` (light) and `.dark` — then exposed via `@theme inline`. **Always use token classes; never
hardcode hex.**

| Token | Light | Dark | Role |
|---|---|---|---|
| `surface` | `#FAF9F7` | `#121110` | Page background |
| `card` | `#FFFFFF` | `#1B1A18` | Elevated surface |
| `elevated` | `#F1EFEC` | `#242220` | Muted fill, hover |
| `line` | `#E4E0D9` | `white/9%` | Hairline border |
| `ink` | `#1C1917` | `#FAF9F7` | Primary text |
| `ink-muted` | `#6E6862` | `#A5A09A` | Secondary text |
| `graphite` | `#1C1917` | `#1B1A18` | Large dark surfaces (sidebar, auth panel) |
| `brass` | `#8A6A3D` | `#8F6B34` | Solid fills — **always with white text** |
| `brass-strong` | `#6E5230` | `#A57C3C` | Hover on solid brass |
| `brass-ink` | `#7A5C33` | `#C79A5B` | Brass **as text/icon** on the page background |
| `brass-soft` | `#A98A5C` | `#8A6A3D` | Focus rings, subtle hairlines |
| `brass-on-dark` | `#C79A5B` (both) | | Brass on graphite (dark in both themes) |
| `positive` | `#3F6B4A` | `#7BAE88` | Money in, success |
| `negative` | `#B4332E` | `#F08A84` | Money owed, errors — **never** for links or decoration |

**The containment rule (most important):** brass never fills large surfaces. It lives in solid
buttons, links, focus rings, hairlines and diffuse glows (blurred radials at 20–30% opacity).
Large dark surfaces use `graphite`. This is what keeps the UI calm. `brass` is dark enough for
white text (4.9:1); `brass-ink` is tuned for brass text on the page background — do not swap them.

**Typography:** `font-sans` (Inter) is everything in the app and all body copy. `font-display`
(Instrument Serif) is marketing headlines only — one or two accent words per heading, oversized
numerals, step numbers. Never a paragraph, a label or any in-app text.

**Component rules:** cards `bg-card`, soft shadow, 12–16px radius. Primary action `bg-brass` +
`text-white`, hover `bg-brass-strong`. Secondary = outline (`border-line`) — hierarchy is fill vs
outline, never a second hue. Charts: brass for the highlighted series, `ink-muted` for neutral,
`positive`/`negative` only where the sign carries meaning; no rainbow charts. Never rely on colour
alone — pair with a glyph or label. Dark mode works via the `.dark` class; every token has a dark
value, so no per-component overrides.

**Brand.** The mark is an M whose central V is brass — drawn in `src/components/brand/logo.tsx`
(`LogoMark`, `Logo`, `LogoLockup`), not loaded as images. PNGs are generated from those same shapes
for places React can't reach (icons, favicon, og-image, email wordmark).

## Landing page

`src/app/page.tsx` is a thin composition; everything lives in `src/components/landing/`
(`primitives.tsx`, `nav.tsx`, `hero.tsx`, `invoice-card.tsx`, `bands.tsx`, `story.tsx`,
`features.tsx`, `insight.tsx`, `pricing.tsx`, `faq.tsx`, `footer.tsx`). Rules: section rhythm
alternates graphite and light; brass never fills a large surface; animate transform and opacity
only; reduced motion via `useCalmMotion()` (never `useReducedMotion()` directly — it breaks
hydration); `overflow-hidden` kills `position: sticky` (clip decorative layers in a nested absolute
container); the page force-removes `.dark` (dark mode is an app-only setting).

## In-app UI kit (`src/components/app/`)

Every app screen is built from one shared kit: `panel.tsx`, `page-header.tsx`, `button.tsx`,
`metric.tsx`, `sparkline.tsx`, `segmented-bar.tsx`, `charts.tsx`, `form.tsx`, `modal.tsx`,
`menu.tsx`, `segmented-control.tsx`, `invoice-editor.tsx`, `step-up.tsx`. Auth pieces in
`src/components/auth/`. Shared motion in `src/components/motion.tsx`.

Rules: **no `dark:` overrides in screens** (every token has a dark value — a screen needing `dark:`
means the token is wrong). One primary action per view, one `tone="brass"` metric per row. Charts
go through `charts.tsx`. Figures use `tabular-nums`. The sidebar and auth panel are graphite in
*both* themes — style against fixed `white/*` and `brass-on-dark`, not theme tokens. Recharts
animation is off on every series. The rebuild is complete: every screen is on the kit and
token-only. `/invoices/new` and `/invoices/[id]/edit` are thin wrappers — behaviour changes belong
in `InvoiceEditor`. `/admin` redirects to `/sys/ctrl`.

The auth context carries the signed-in person's `company` alongside `user`; anything that changes
the company must call `refreshCompany()` or the sidebar goes stale.

## Core features

Auth (email/password + Google OAuth; structured for later Apple Sign-In) · user/company profile
with logo and tax fields · client CRUD · invoice creation (dynamic items, auto-calculations,
drag-to-reorder, drafts, duplicate) · invoice lifecycle (Draft/Sent/Paid/Overdue; bank transfer,
card, cash, other) · send invoice (email + PDF) · dashboard (revenue, paid vs unpaid, trends,
expenses) · invoice management (hybrid table/card, filters, search, quick actions) · expenses
(fixed/variable, categories, monthly) · admin panel (restricted metrics + growth) · donation
system (support button, progress bar; Stripe/PayPal/BMC structure prepared, not implemented).

## Architecture constraints

- **i18n from the start:** English (UK) first; structure allows adding languages easily.
- **Mobile-first responsive;** no native apps initially, but the API stays clean for a future one.
- **Future-ready (do not implement):** multi-user companies/teams, roles, recurring invoices,
  Stripe/PayPal, notifications.
- **Modular, separation of concerns;** scalable from day one.

## UX principles

Fast, intuitive, visually refined — Linear (UX quality) and Notion (simplicity). Drag & drop where
it improves UX (invoice line items at minimum). Micro-interactions and smooth animations. Real-time
feedback (instant calculations, optimistic updates). Avoid clunky forms, overloaded dashboards,
outdated patterns.

## Audits

`docs/Audit/audit.md` is the entry point for every runnable audit playbook. Every audit finishes
against production, not just locally. The owner's account is never a test subject; everything
created is `ZZ-AUDIT-` prefixed and deleted; abusive probes stay local. Account isolation is the
one that matters most — `users.id` is the only boundary and it is enforced by hand.
