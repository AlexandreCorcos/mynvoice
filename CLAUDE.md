# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MYNVOICE** is an open-source, free invoice and expense management system for small businesses, freelancers, and self-employed professionals. The goal is a modern, elegant UX — not a generic SaaS tool.

Slogan: *"Your business. Your invoices."*

## Planned Architecture

```
/backend      # Python + FastAPI
/frontend     # React/Next.js + TailwindCSS + Framer Motion
/docs         # Documentation
/examples     # UI reference screenshots (inspiration only, do not copy)
```

### Backend
- **Language:** Python
- **Framework:** FastAPI
- **Database:** PostgreSQL
- **Auth:** JWT or session-based; email+password and Google OAuth

### Frontend
- **Framework:** React + Next.js
- **Styling:** TailwindCSS
- **Animations:** Framer Motion
- **Drag & Drop:** dnd-kit

## Versioning

Every feature or fix commit must bump `frontend/package.json` version **and** update `frontend/public/meta.json` to match. See **`docs/versioning.md`** for the full process, semver guide, and how the in-app update banner works.

## Commands

No code has been implemented yet. Commands will be added here as the project is scaffolded.

## Design System

**Color Palette (Graphite & Brass):**

A warm-graphite neutral axis plus **one** chromatic (brass). Elegance comes from
restraint, not from more colour. Never introduce a second accent hue.

All tokens live in `frontend/src/app/globals.css` and are defined twice — once in
`:root` (light) and once in `.dark` — then exposed to Tailwind via `@theme inline`.
**Always use the token classes; never hardcode hex in components.**

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
| `brass-on-dark` | `#C79A5B` (both) | | Brass on graphite, which is dark in both themes |
| `positive` | `#3F6B4A` | `#7BAE88` | Money in, success |
| `negative` | `#B4332E` | `#F08A84` | Money owed, errors — **never** for links or decoration |

**The containment rule (most important):**
Brass never fills large surfaces. It lives in solid buttons, links, focus rings,
hairlines and diffuse glows (blurred radials at 20–30% opacity). Large dark
surfaces use `graphite`. This is what keeps the UI calm.

**Fill vs text are different needs.** `brass` is dark enough for white text (4.9:1);
`brass-ink` is tuned for brass text on the page background. Do not swap them.

**Typography:**

| Token | Family | Where |
|---|---|---|
| `font-sans` (default) | Inter | Everything in the app, and all body copy |
| `font-display` | Instrument Serif | Marketing headlines only — accent words, oversized numerals, step numbers |

The serif is an *accent*, never a body face. On the landing page it carries one
or two words per heading (usually italic, usually in `brass-ink` /
`brass-on-dark`) and the large figures in the proof band and pricing card.
Never set a paragraph, a label or any in-app text in it.

**Component rules:**
- Cards: `bg-card`, soft shadow, 12–16px border radius
- Primary action: `bg-brass` + `text-white`, hover `bg-brass-strong`
- Secondary action: outline (`border-line`) — hierarchy comes from fill vs outline, not a second hue
- Charts: brass for the highlighted series, `ink-muted` for the neutral one, `positive`/`negative` only where they carry meaning; no rainbow charts
- Never rely on colour alone to convey meaning — pair it with a glyph or label
- Avoid heavy gradients, visual noise

**Dark mode:** works via the `.dark` class; every token already has a dark value,
so no per-component overrides should be needed.

**Brand assets** are retinted to Graphite & Brass. The letterforms were never
redrawn — only the ink was remapped — so the wordmark shapes are unchanged:

| Asset | Treatment |
|---|---|
| `public/logo-mynvoice.png` | "MY" → `brass`, "nvoice" → `ink` |
| `public/logo-mynvoice-white.png` | unchanged — pure white ink, nothing to retint |
| `public/mark-512.png` | graphite tile, white M, `brass-on-dark` tittle |
| `public/og-image.png` | graphite background (radial blob preserved), brass pill |
| `src/app/icon.png` | kept byte-identical to `mark-512.png` |
| `src/app/apple-icon.png` | same treatment as the mark |
| `src/app/favicon.ico` | rebuilt at 16 + 32 from the new mark |

The working files `logo/mynvoiceB.png` and `logo_prompt/logo_dark_light.png` are
source material, are not shipped, and still show the old palette.

## Landing Page

`src/app/page.tsx` is a thin composition; everything lives in
`src/components/landing/`:

| File | Role |
|---|---|
| `primitives.tsx` | All shared motion: `Reveal`, `MaskText`, `Magnetic`, `Tilt`/`Depth`, `Spotlight`, `Marquee`, `CountUp`, `Aurora`, `GridLines`, `Grain`, `ScrollProgress`, `ShimmerBorder`, `Eyebrow`, `DrawPath` |
| `nav.tsx` | Floating pill nav + full-screen mobile sheet |
| `hero.tsx` / `invoice-card.tsx` | Graphite hero and its live product mock |
| `bands.tsx` | Capability marquee + the four-number proof band |
| `story.tsx` | Pinned three-act scroll story (desktop) / stack (mobile) |
| `features.tsx` | Bento grid where each tile animates its own feature |
| `insight.tsx` | Dashboard section that unfolds in 3D on scroll |
| `pricing.tsx`, `faq.tsx`, `footer.tsx` | Closing sections |

Rules that keep it coherent:

- **Section rhythm alternates graphite and light.** hero → ticker (graphite),
  proof (light), story (graphite), features + dashboard (light), pricing
  (graphite), faq (light), footer (graphite).
- **Brass never fills a large surface**, here least of all. It appears as the
  `Aurora` glow, hairlines, accent words, focus rings and solid buttons.
  Big dark areas are `graphite`.
- **Animate transform and opacity only.** No width/height/top/left tweens
  except where an element is genuinely a bar chart.
- **Reduced motion:** use `useCalmMotion()` from `primitives.tsx`, never
  `useReducedMotion()` directly — the raw hook reports `false` during SSR and
  the real value on the client, which breaks hydration for exactly the people
  it's meant to help. The page is also wrapped in
  `<MotionConfig reducedMotion="user">`.
- **`overflow-hidden` kills `position: sticky`.** Sections that pin something
  must clip their decorative layers in a nested absolute container instead.
- The page force-removes the `.dark` class: dark mode is an app-only setting.

## In-App UI

Every app screen is built to the same standard as the landing page from one
shared kit in `src/components/app/`:

| File | Role |
|---|---|
| `panel.tsx` | `Panel`, `PanelHeader`, `Overline`, `PanelRule` — the card every screen is built from |
| `page-header.tsx` | `PageHeader` — eyebrow + title + subtitle + actions. Every screen starts with one |
| `button.tsx` | `Button` / `ButtonLink` — `primary` (solid brass), `secondary`, `ghost`, `danger` |
| `metric.tsx` | `MetricCard` — count-up figure, delta chip, optional sparkline |
| `sparkline.tsx` | Tiny self-drawing SVG trend, no axes |
| `segmented-bar.tsx` | `SegmentedBar` + `AGEING_RAMP` — one bar, several buckets |
| `charts.tsx` | `RevenueTrendChart`, `ChartLegend` — the single themed recharts entry point |
| `form.tsx` | `Field`, `Input`, `Select`, `Textarea`, `SearchInput` — labels always visible |
| `modal.tsx` | `Modal` — blurred backdrop, Escape to close, body scroll locked |
| `menu.tsx` | `RowMenu` — fixed-positioned "…" dropdown that flips near the viewport edge |
| `segmented-control.tsx` | Filter tabs whose selection slides via `layoutId` |
| `invoice-editor.tsx` | `InvoiceEditor` shared by /invoices/new and /invoices/[id]/edit |

Auth-only pieces live in `src/components/auth/`: `ui.tsx` (`AuthHeading`,
`AuthError`, `PasswordInput` with a strength meter) and `password-form.tsx`
(shared by /set-password and /reset-password).

`form.tsx` also exports `Toggle`; `charts.tsx` also exports `GroupedBarChart`
and `RankedList`.

**Recharts animation is switched off** on every series. With a dozen
categories the bar rectangles simply never mount — the panel around the
chart already animates in, so nothing is lost and the render is
deterministic.

Motion shared with the landing page (`EASE_OUT`, `useCalmMotion`, `CountUp`)
lives in `src/components/motion.tsx`; `components/landing/primitives.tsx`
re-exports it so landing code still imports from one place.

Rules:

- **No `dark:` overrides in screens.** Every token already has a dark value.
  A screen needing `dark:` means the token is wrong — fix the token.
  (`globals.css` still carries a legacy bridge for the not-yet-rebuilt
  screens; that bridge shrinks as pages are redone, and nothing new should
  rely on it.)
- **One primary action per view**, and one `tone="brass"` metric per row.
  Hierarchy is fill vs outline, never a second hue.
- **Charts go through `charts.tsx`.** Brass carries the meaning, `ink-muted`
  carries the context, `positive`/`negative` only where the sign is the
  point. Ageing and similar ramps run positive → brass → negative, never
  through a rainbow.
- **Figures use `tabular-nums`** so columns of money line up.
- The sidebar and auth panel are graphite in *both* themes, so style them
  against fixed `white/*` and `brass-on-dark` values, not theme tokens.

### Rebuild status

| Screen | State |
|---|---|
| Shell (sidebar, topbar, layout) | rebuilt |
| Dashboard | rebuilt |
| Invoices (list, new, detail, edit) | rebuilt |
| Shared: status badge, empty state, toast | rebuilt |
| Clients · Items · Payments · Expenses | rebuilt |
| Reports · Settings · Admin · Support | rebuilt |
| Onboarding checklist | rebuilt |
| Auth screens (login, register, password reset) | rebuilt |

The rebuild is complete — every screen is on the kit and token-only, and
the `globals.css` legacy utility bridge has been removed. Nothing should
reintroduce `bg-white` / `border-gray-*` / `bg-emerald-50` and friends;
a bare `bg-white` now means "white in both themes" and is only correct on
graphite.

`/invoices/new` and `/invoices/[id]/edit` are thin wrappers — behaviour
changes belong in `InvoiceEditor`, not in either route.

## Core Features

1. **Auth:** Email/password + Google OAuth. Design auth structure to accommodate Apple Sign-In later without implementation.
2. **User/Company Profile:** Logo upload, invoice branding, VAT/tax fields.
3. **Client Management:** CRUD for clients (company name, email, address, contact person).
4. **Invoice Creation (critical):** Minimal steps, dynamic items, auto-calculations (subtotal/tax/total), drag-to-reorder items, save drafts, duplicate invoices.
5. **Invoice Lifecycle:** Statuses — Draft, Sent, Paid, Overdue. Payment methods: bank transfer, card, cash, other.
6. **Send Invoice:** Email delivery with PDF attachment and email template system.
7. **Dashboard:** Revenue totals, paid vs unpaid, monthly trends, expense overview — clean charts, minimal cognitive load.
8. **Invoice Management Screen:** Hybrid table/card UI (not a boring table), filters by status/date/client, search, quick actions.
9. **Expenses Module:** Fixed and variable expenses, user-defined categories, monthly tracking.
10. **Admin Panel:** Restricted. Metrics: total users, active users, invoices created/paid, expenses recorded. Growth charts. Configurable monthly donation cost target.
11. **Donation System:** "Support" button in UI, dedicated donation page with progress bar (e.g. "£420 / £1,000 monthly cost covered"). Prepare Stripe/PayPal/Buy Me a Coffee structure without full implementation.

## Architecture Constraints

- **i18n from the start:** Initial language English (UK). Structure must allow adding languages easily.
- **Mobile-first responsive:** No native apps initially, but API must be clean for future mobile app consumption.
- **Future-ready (do not implement):** Multi-user companies/teams, roles/permissions, recurring invoices, Stripe/PayPal integrations, notifications system.
- **Modular, separation of concerns:** scalable from day one.

## UX Principles

- Fast, intuitive, visually refined — inspired by Linear (UX quality) and Notion (simplicity).
- Drag & drop where it improves UX (invoice line items at minimum).
- Micro-interactions and smooth animations throughout.
- Real-time feedback (instant calculations, optimistic UI updates).
- Avoid clunky forms, overloaded dashboards, and outdated UI patterns.
