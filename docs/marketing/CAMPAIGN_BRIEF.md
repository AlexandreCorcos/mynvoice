# MYNVOICE — Campaign Brief

**The single source of truth for anyone (human or agent) writing marketing copy,
social posts, ads or landing content for MYNVOICE.**

> Read this whole file before writing a single caption. Everything in it was
> verified against the actual codebase and the live production app — not from
> memory, not from the pitch. § 14 (**Never claim this**) is not optional: it
> lists things that sound true and are not. Writing this document is how we
> caught a "Google sign-in" claim that was live on our own landing page with no
> feature behind it — that's exactly the mistake § 14 exists to prevent.

**Slogan:** *Your business. Your invoices.*
**Live app:** https://app.mynvoice.com · **Landing:** https://mynvoice.com
**Source:** https://github.com/AlexandreCorcos/mynvoice (MIT)
**Support:** https://buymeacoffee.com/acorcos · card: the Stripe payment link on the site

---

## 1. How to use this document

| You're writing… | Read at minimum |
|---|---|
| A single caption or ad | § 2, § 5, § 9, § 10, § 14 |
| A LinkedIn post / article | § 2, § 5, § 8, § 11.2, § 12, § 14 |
| A carousel or video script | § 6 (features), § 9 (voice), § 12 (formats) |
| A campaign plan | all of it |

Three rules that override everything else:

1. **Never invent numbers, users, testimonials or reviews.** We have none to
   quote yet. Say what the product *does*, not how many people love it.
2. **Never promise a feature that isn't shipped.** § 6 is what exists. § 14 is
   what doesn't. If it's in neither, assume it doesn't exist and ask.
3. **Match the voice in § 9.** MYNVOICE does not shout. The honesty *is* the
   marketing — the moment we sound like every other SaaS ad, we've lost the one
   thing that makes us different.

---

## 2. What MYNVOICE is

**One line:**
> A free, open-source invoicing and expense manager for freelancers and small
> businesses.

**Elevator (≈30 words):**
> MYNVOICE is invoicing without the subscription. Create a branded invoice in
> under a minute, track expenses and payments, see exactly where your money
> stands — free forever, open source, and yours to export or self-host.

**Full paragraph:**
> MYNVOICE is a free, open-source invoice and expense management system built
> for freelancers, the self-employed and small businesses. It handles the whole
> money side of a small operation — invoices, clients, items, expenses,
> payments, reports and month-end closing — in one calm, fast interface. There
> is no paid tier, no trial clock, no feature held back behind an upgrade
> button. It's MIT licensed, so the entire source is public and you can run it
> on your own hardware if you'd rather. Hosting is paid for by voluntary
> donations, not by your data.

**Category:** invoicing / small-business finance / open-source SaaS.
**The wedge:** everyone else's free tier is a trial. Ours is the product.

---

## 3. The core promise

> **Everything, free, forever — and the code to prove we mean it.**

Most "free" invoicing tools are free until invoice #6, or until you need your
own logo on the PDF, or until they get acquired. MYNVOICE's answer isn't a
promise — it's a licence. MIT means that if the project ever turned hostile,
anyone could fork the last free version and carry on. **That's the whole pitch:
we removed our own ability to hold you hostage.**

---

## 4. Who it's for

| Audience | What they feel today | What to say to them |
|---|---|---|
| **Freelancers** (design, dev, copy, consulting) | Invoicing is a chore between real work; £15/month for 4 invoices feels absurd | "A beautiful invoice in under a minute. £0, forever." |
| **Self-employed / sole traders** | Spreadsheets + Word template + hope | "Stop rebuilding the same spreadsheet every month." |
| **Small businesses / micro-agencies** | Outgrew spreadsheets, can't justify accounting software | "The whole money side, in one calm place." |
| **Developers & the open-source crowd** | Sceptical of "free", care about data ownership | "MIT licensed. `docker compose up`. Your box, your database." |
| **Privacy-minded users** | Tired of being the product | "No ads. No upsells. Your data is not the business model." |
| **Side-hustlers / new businesses** | Every pound counts at the start | "Free while you're figuring it out. Free when you're not." |

**Secondary audience worth targeting on LinkedIn:** accountants and bookkeepers
whose clients need something better than a spreadsheet but won't pay for
software.

---

## 5. The pillars (the seven things worth saying)

Each pillar has a claim, the proof behind it, and a line you can actually post.

### 5.1 Free. Forever. Genuinely.
- **Proof:** no billing code, no paid tier, no plan table in the repo. MIT licence.
- **Post:** "No tiers. No trial clock. No feature held hostage behind an upgrade button."
- **Objection it kills:** "free until what?"

### 5.2 Open source, in public
- **Proof:** MIT licensed, full source on GitHub, issues public, self-hostable with the same Docker setup we run.
- **Post:** "You don't have to trust us. You can read us."
- **Ask:** a GitHub star costs nothing and genuinely helps people find it.

### 5.3 Your data is actually yours
- **Proof:** export any time; run it on your own hardware; PostgreSQL you control if self-hosted; no data resale, no ad tech.
- **Post:** "Export it, or self-host it. Either way it's yours — that's not a setting, it's the licence."

### 5.4 Security taken seriously — and audited in the open
- **Proof:** see § 8 for the full list. Sessions in `HttpOnly` cookies (not `localStorage`), CSRF protection on every write, per-account isolation, 2FA (TOTP) on destructive admin actions, admin audit log, rate limiting and account lockout, strict security headers, no API docs or secrets exposed in production.
- **Stronger proof:** we run structured security audits against **production**, fix what we find, and **publish the results in the repo** (`docs/Audit/`), including the bugs we found in ourselves.
- **Post (LinkedIn gold):** "We audited our own invoicing app across five playbooks, found two ways one account could see another's data, fixed them the same day — and published the whole report. Here's what it looked like."

### 5.5 It's genuinely nice to use
- **Proof:** drag-to-reorder line items, live-calculating totals, autosaving drafts, duplicate-last-invoice, dark mode, mobile-first responsive, real animation work.
- **Post:** "Invoicing software that doesn't feel like a tax return."
- **Angle:** most free tools look free. This one doesn't.

### 5.6 No ads, no upsells, no noise
- **Proof:** zero ad tech, zero upsell prompts, no "upgrade" modals anywhere in the product.
- **Post:** "0 ads. 0 upsells. Not now, not later."

### 5.7 Funded by people who find it useful
- **Proof:** Buy Me a Coffee + a Stripe card link; donations cover servers, database, email delivery, domain, backups.
- **Post:** "Servers aren't free — but your invoicing is. Chip in if it saved you an afternoon; use it anyway if it didn't."
- **Tone rule:** ask once, lightly, never guilt. "And if you can't, use it anyway. That's the deal."

---

## 6. Feature inventory (everything that actually ships)

Use this as the factual menu. If it's not here, don't promise it.

### 6.1 Invoicing
- Create, edit, duplicate and delete invoices
- **Drag-and-drop line items** to reorder
- Live-calculating **subtotal, tax and total** as you type
- **Per-invoice tax rate** and **discount**
- Draft autosave
- **Invoice statuses:** draft, sent, paid, overdue, cancelled
- **Automatic per-account invoice numbering**, with custom prefix, optional year in the number, and per-client numbering settings
- Reference field, notes, terms and footer per invoice
- **Branded PDF** with your logo and company details
- **3 PDF templates:** classic, minimal, bold
- **Email the invoice** with the PDF attached, with a copy to your own inbox for the paper trail
- Invoice-level payment method and payment date
- Guardrails: a paid invoice can't be silently edited; a paid invoice can't be cancelled or deleted; totals can't go negative; a due date can't precede the issue date

### 6.2 Clients
- Full client records: company name, contact person, email, phone, full address, VAT number
- Per-client defaults: payment terms, notes, invoice prefix, numbering, bank details
- Client receivables total
- Saved once, reused on every invoice

### 6.3 Items & services catalogue
- Reusable items with name, description, unit price and unit
- Drop them into invoices instead of retyping

### 6.4 Payments
- Record payments against an invoice or a client
- **Automatic payment numbering** per account
- Payment method, date, reference and notes
- **Partial payments**: `amount_paid` rises, balance falls, status follows
- Paying the balance in full marks the invoice paid automatically
- Deleting a payment correctly reverses it off the invoice
- **Overpayment is refused** — the books can never record more received than invoiced

### 6.5 Expenses & transactions
- Fixed and variable expenses
- **Your own categories** (with colour and icon) and a reusable item catalogue inside them
- Vendor, notes, dates, currency
- **Billable expenses** linked to a client
- **Convert expenses into invoice line items**
- **CSV import**
- **Bank reconciliation**: tick transactions off individually or in bulk
- A single ledger holding both expenses and income, cash-basis

### 6.6 Dashboard
- Revenue, paid, unpaid and overdue as honest separate figures
- **Receivables ageing buckets**
- **Monthly revenue-vs-expenses trend**
- Client and invoice counts
- Built so "outstanding" means one thing everywhere

### 6.7 Reports
- Revenue by period (month / quarter / year)
- **Revenue by client**
- **Expenses by category**
- Summary: total invoiced, total received, total outstanding, total expenses, **net profit**
- Cash-basis "received" vs accrual "invoiced" kept distinct on purpose

### 6.8 Month-end closing (a genuine differentiator)
- Define **accounting periods** and **close** them
- Closing takes a **snapshot** of the period's figures
- The app then **detects drift** — if a closed period's live totals no longer match the snapshot, you're told
- Reopen a period when you need to
- **PDF export of a closed period**
- *Very few free tools have anything like this. Worth its own post for the accounting-minded audience.*

### 6.9 Company profile & branding
- Company identity: name, legal name, registration number, VAT number, tax ID
- **Logo upload** — appears on every invoice and PDF
- Contact details and full address printed on every invoice
- Default payment terms, default notes
- Invoice numbering rules
- **Bank details** for payment instructions

### 6.10 Multi-currency
- **GBP, EUR and USD**, chosen per invoice
- Currency travels with every figure so amounts in different currencies are never silently summed together

### 6.11 Accounts, security & admin
- Email + password accounts with email verification
- Password reset
- Sessions as `HttpOnly` cookies with silent refresh
- Dark mode with persistent preference
- Mobile-first responsive across every screen
- Admin control panel (owner-side): user metrics, presence, audit trail, TOTP-gated destructive actions

### 6.12 Self-hosting
- The same Docker Compose stack we run in production
- `git clone` → `docker compose up`
- Bring your own PostgreSQL, your own domain, your own everything

---

## 7. Tech stack (for developer-facing content)

| Layer | Tech |
|---|---|
| Backend | **Python 3.12 · FastAPI** |
| Database | **PostgreSQL** with async SQLAlchemy, Alembic migrations |
| Frontend | **Next.js 15** (App Router) · **TypeScript** · **React** |
| Styling | **TailwindCSS v4** with custom design tokens |
| Motion | **Framer Motion** |
| Charts | **Recharts** |
| Drag & drop | **dnd-kit** |
| Icons | **Lucide** |
| PDF | **WeasyPrint** (server-side HTML → PDF) |
| Email | **SendGrid** (SMTP) |
| File storage | **Cloudflare R2** |
| Hosting / deploy | **Coolify** + Docker Compose, GitHub webhook auto-deploy |
| Edge | **Cloudflare** (TLS, HSTS, security headers) |
| Licence | **MIT** |

Good hooks for a dev audience: async SQLAlchemy, server-rendered PDFs, cookie
sessions instead of `localStorage` tokens, migrations that run on deploy.

---

## 8. Security & privacy (the detail behind pillar 5.4)

Everything here is implemented and was verified in production. This is the
strongest and least-copied part of our story — most free tools cannot say any
of it.

**Sessions & auth**
- Session lives in an **`HttpOnly` cookie**, so injected JavaScript cannot read or steal it — deliberately *not* a token in `localStorage`
- Cookies are **`Secure`**, **`SameSite=Lax`**, and **host-only** (never scoped to a wildcard domain, so no subdomain can claim your session)
- **CSRF double-submit token** required on every state-changing request
- Silent session refresh; logout is a real server-side revocation
- Passwords hashed with **bcrypt**
- **Rate limiting** per address plus **per-account lockout** after repeated failures
- Registration and password reset never reveal whether an email address has an account

**Data isolation**
- Every record is scoped to its owner; one account cannot read, modify or reference another's invoices, clients, items, payments or expenses
- Cross-account references are rejected at write time *and* at render time (including in generated PDFs)

**Admin safety**
- Admin is granted server-side only — there is no admin password in the codebase
- Destructive admin actions require a **TOTP second factor** (time-limited, browser-bound, replay-protected)
- Every privileged action writes an **audit log** row
- An admin cannot demote or deactivate themselves; the last admin cannot be removed

**Platform**
- **HSTS**, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Content-Security-Policy, Referrer-Policy
- API documentation and schema are **disabled in production**
- **No secrets or source maps** in the shipped frontend bundle
- Exact-match CORS — no wildcard subdomain trust
- No arbitrary subdomain serves the app (wildcard DNS deliberately removed)
- The PDF renderer is restricted so invoice content can never make the server fetch attacker-controlled URLs

**And the honest part**
- We run structured audits against **production**, not just a local copy
- When an audit finds a real defect, we fix it, ship it, re-test it live, and **write it down in the public repo**
- The audit playbooks and results live in `docs/Audit/` for anyone to read

> **Campaign angle:** "Most invoicing tools tell you they're secure. We publish
> the audit — including the bugs we found in ourselves and how fast we fixed
> them." This is credible, unusual, and very LinkedIn-shaped.

---

## 9. Brand & voice

### 9.1 Voice
MYNVOICE sounds like **a competent person explaining something plainly** — not
like a marketing department.

**It is:** honest · calm · understated · specific · quietly confident · British in register · occasionally dry.
**It is not:** hypey · exclamatory · emoji-stuffed · urgency-faking · buzzwordy · salesy.

The house style is to **state the fact and stop**. The product's own copy is the
best reference:

> "No tiers, no trial clock, no feature held hostage behind an upgrade button."
> "Servers aren't free — but your invoicing is."
> "And if you can't, use it anyway. That's the deal."
> "You don't have to trust us. You can read us."
> "A dashboard that respects your attention."

**Do**
- Lead with the concrete benefit ("a branded invoice in under a minute")
- Use real numbers only when they're real (£0, MIT, 3 currencies, 5 audit playbooks)
- Admit limits — it buys credibility for everything else
- Short sentences. Full stops. Let the claim land.

**Don't**
- "Revolutionary", "game-changing", "supercharge", "unlock", "10x"
- Fake urgency ("limited time", "act now") — nothing here is limited
- Exclamation marks (basically ever)
- Emoji walls. One, occasionally, on Instagram. Zero on LinkedIn.
- Compare by naming competitors negatively; describe the *pattern* instead ("tools that start free and bill you at invoice six")

### 9.2 Visual identity
- **Palette — "Graphite & Brass".** A warm-graphite neutral axis plus exactly **one** accent: brass. Never introduce a second accent colour.
  - Brass `#8A6A3D` (fills, always with white text) · brass-on-dark `#C79A5B` (brass on dark surfaces)
  - Graphite `#1C1917` (large dark surfaces) · Surface `#FAF9F7` · Card `#FFFFFF`
  - Ink `#1C1917` · Ink-muted `#6E6862`
  - Positive `#3F6B4A` (money in) · Negative `#B4332E` (money owed/errors — never decoration)
- **The containment rule:** brass never fills large areas. It's for buttons, links, hairlines, accent words and soft glows. Big dark areas are graphite. *This restraint is what makes it look expensive.*
- **Typography:** **Inter** for everything; **Instrument Serif** *only* as a display accent — one or two words in a headline, usually italic, usually brass. Never set body copy in the serif.
- **The mark:** an M whose central V is brass — the M of MYNVOICE and a V for inVoice that doubles as a downward arrow. Two colours, three strokes.
- **Wordmark:** "MY" in brass at weight 800, "nvoice" in ink at 600.
- **Mood:** calm, spacious, precise. Think Linear and Notion, not Mailchimp.

### 9.3 Design do/don't for creatives
- **Do:** generous whitespace · one focal point per image · real product screenshots · dark graphite panels with a single brass glow · tabular figures for money
- **Don't:** rainbow gradients · stock photos of people high-fiving · cluttered feature grids · drop shadows everywhere · a second accent colour

---

## 10. Messaging library

### 10.1 Taglines
- Your business. Your invoices. *(the official slogan)*
- Free. Forever. Genuinely.
- Invoicing without the subscription.
- The calm way to invoice, track and get paid.
- Open source. Open books.
- Everything, free, forever — and the code to prove it.

### 10.2 Headlines / hooks
- "£15 a month to send four invoices. Or £0, forever."
- "Your invoicing tool's free tier ends at invoice six. Ours doesn't end."
- "A beautiful invoice in under a minute."
- "Free until they change their mind? Ours is MIT licensed — they can't."
- "The whole money side, in one calm place."
- "You don't have to trust us. You can read us."
- "Stop rebuilding the same spreadsheet every month."
- "No ads. No upsells. No card required."
- "We published our own security audit. Including the bugs."
- "Self-host it and we never see a byte of your business."

### 10.3 Calls to action
| Goal | CTA |
|---|---|
| Sign up | "Create your free account" · "Send your first invoice today" |
| Repo | "Star it on GitHub" · "Read the source" |
| Self-host | "Clone it and run it yourself" |
| Donate | "Chip in for the servers" · "Buy me a coffee" |
| Soft | "Have a look" · "See how it works" |

### 10.4 Proof points you may use (all verified)
- MIT licensed, full source public
- £0 — no paid tier exists in the code
- 0 ads, 0 upsells, no card required to sign up
- 3 currencies built in (GBP · EUR · USD)
- 3 PDF templates
- Self-hostable with one Docker command
- Security audited against production, results published in the repo
- 2FA (TOTP) on destructive admin actions
- Export your data at any time

---

## 11. Platform guidance

### 11.1 Instagram
- **Audience:** freelancers, creatives, side-hustlers, small business owners.
- **Angle:** the *feeling* — calm, beautiful, effortless. Lead with the product's looks and the £0.
- **Formats:** carousels (5–8 slides), Reels (15–30s screen recordings), single-image quote cards, Stories with a poll/question.
- **Copy length:** 1–3 short lines, then a line break, then the CTA. Front-load the hook — the first line is all most people read.
- **Emoji:** sparingly. Zero or one. Never a wall.
- **CTA:** link in bio. Instagram links are unclickable in captions — never write "click the link below".
- **Winning content:** before/after (spreadsheet → invoice), a 20-second "invoice in under a minute" screen recording, dark-mode beauty shots, the drag-to-reorder interaction.

### 11.2 LinkedIn
- **Audience:** freelancers, consultants, small-business owners, developers, accountants.
- **Angle:** the *reasoning* — why free is sustainable, why open source matters for financial data, what a real security audit looks like.
- **Formats:** text posts (600–1,300 chars sweet spot), document/carousel PDFs, build-in-public updates.
- **Structure:** strong first line (it's the only bit shown before "…see more") → one blank line → 3–6 short paragraphs → a question or CTA.
- **Emoji:** none, or a single functional one. No hashtag spam — 3 max.
- **Winning content:**
  - The security-audit story (§ 5.4) — the single best LinkedIn asset we have
  - "Why we made an invoicing app free forever and how it's funded"
  - "What month-end closing with drift detection is, and why your spreadsheet can't do it"
  - Build-in-public: what shipped this week, what broke, what we learned
  - The data-ownership argument for financial software
- **Tone:** the most technical and most credible of the three. Never breathless.

### 11.3 Facebook
- **Audience:** small business owners, tradespeople, sole traders, an older-skewing and less technical crowd.
- **Angle:** the *practical* — saves you time, costs you nothing, looks professional to your clients.
- **Formats:** single image + short paragraph, short video, link posts. Groups (freelance/small-business communities) can outperform the page, but **read each group's self-promo rules and never spam**.
- **Copy length:** 2–4 plain sentences. Less jargon than LinkedIn, more explanation than Instagram.
- **Avoid:** developer language ("MIT licensed", "self-host", "Docker") unless the group is technical — translate it to "the code is public and free to use forever".
- **Winning content:** "look how professional your invoice looks to your client", the £0 message, simple how-it-works walkthroughs.

---

## 12. Campaign & content pillars

Rotate these so the feed isn't all one note. A healthy mix is roughly
40% product · 25% philosophy · 20% education · 15% build-in-public.

**A. Product in action** — a single feature, shown, not described. Drag-to-reorder. Live totals. The PDF. Dark mode. The dashboard.

**B. The free-forever philosophy** — why it's free, how it's funded, why MIT matters, what "your data is yours" actually means in practice.

**C. Security & trust** — the audit story, cookie sessions vs `localStorage`, 2FA on admin actions, "we publish our findings".

**D. Education / useful-on-its-own** — invoicing basics, what to put on an invoice, chasing late payers, what receivables ageing tells you, month-end closing explained. *These earn saves and shares even from people who never sign up.*

**E. Build in public** — what shipped, what broke, a bug we found and fixed, a design decision and why. Highly effective on LinkedIn, builds the honesty brand.

**F. The ask** — GitHub stars, donations, feedback, feature requests. Sparingly: at most one in every six or seven posts, and always after giving something.

### Ready-made post concepts
1. **"Invoice in 60 seconds"** — screen recording, no cuts, real time. Caption: the £0 line.
2. **"The free tier that doesn't end"** — carousel: what other tools gate (logo, invoice count, PDF, clients) vs what we gate (nothing).
3. **"We audited ourselves and published it"** — LinkedIn text post, links to `docs/Audit/` in the repo.
4. **"Where your data lives"** — explain hosted vs self-hosted, export any time.
5. **"What's actually on a good invoice"** — educational carousel, product as the example.
6. **"Servers aren't free — but your invoicing is"** — the donation ask, done lightly.
7. **"Read the source"** — for the dev audience, the GitHub star ask.
8. **"Month-end, closed"** — the closing/drift-detection feature, aimed at the accounting-minded.
9. **"Dark mode"** — pure beauty shot, minimal caption.
10. **"Three currencies, no spreadsheet"** — for anyone invoicing abroad.

---

## 13. Hashtags

Keep them relevant and modest. Instagram: 8–15. LinkedIn: ≤3. Facebook: 0–2.

**Core:** #invoicing #freelance #freelancer #smallbusiness #selfemployed #soletrader #invoice #freelancelife #smallbusinesstips #businesstools
**Open source / dev:** #opensource #mitlicense #selfhosted #foss #nextjs #fastapi #buildinpublic #indiehackers
**Finance-flavoured:** #bookkeeping #cashflow #getpaid #latepayments #vat

---

## 14. ⚠️ Never claim this

These are the traps. Some of them are things we *want* to be true, one of them
is currently written on our own landing page, and all of them would be false.

| Do **not** claim | Reality |
|---|---|
| **"Google sign-in" / "Sign in with Google"** | **Not implemented.** There is no `/auth/google` route. The dead login button and the false landing-page claim were both removed in v0.23.19; the schema, config and CSRF exemption remain for whenever OAuth is built. |
| "Apple sign-in" | Not implemented; only structurally anticipated |
| Recurring / automatic invoices | Not implemented |
| Team accounts, multi-user, roles or permissions | Not implemented — one account, one user |
| Pay an invoice by card / Stripe checkout for your clients | Not implemented. Stripe is only a **donation** link for us; clients pay you by your own bank details |
| PayPal integration | Not implemented |
| Notifications, reminders, automated chasing of late payers | Not implemented |
| Any language other than **English (UK)** | Only `en-GB` ships today. The system is *structured* for more, but none exist yet — never say "multilingual" |
| Any currency beyond **GBP, EUR, USD** | Only these three |
| Mobile app (iOS/Android) | There is no native app. It's a mobile-first *web* app |
| Bank feeds / open banking / automatic bank import | Not implemented. Reconciliation is manual ticking + CSV import |
| A donation progress bar / "£X of £Y raised" | **Removed from the product.** Do not reference raised amounts or a funding goal — we do not publish those figures |
| Specific user counts, invoices sent, revenue processed, "trusted by N businesses" | We have no such figures to publish. **Never invent them** |
| Testimonials, quotes, star ratings, reviews | We have none. Do not fabricate |
| "Bank-level encryption", "military-grade security", "100% secure", "unhackable" | Meaningless or unprovable. Use the specific, true claims in § 8 instead |
| "GDPR compliant", "SOC 2", "ISO 27001", "certified" | No audit or certification of that kind has been performed. Describe our *practices*, never claim a certification |
| Accounting/tax **advice**, "HMRC approved", "Making Tax Digital compatible" | We are not an accountant and hold no such approval. The app records your figures; it does not file or advise |
| "Never goes down", uptime percentages, SLAs | We publish no SLA and run a small server |
| Naming a competitor and calling them a rip-off / scam | Describe the *pattern*, never attack a named company |

**If you're unsure whether something ships: it doesn't. Ask before writing it.**

---

## 15. Objection handling

| They say | Answer with |
|---|---|
| *"Free? What's the catch?"* | There isn't one — and you don't have to take our word for it. It's MIT licensed: the source is public, and if we ever changed the deal you could fork the last free version. Hosting is covered by voluntary donations. |
| *"It'll be free until you get big, then you'll charge."* | The licence makes that unenforceable. Anyone can run the free version forever, including you, on your own server. |
| *"Is my financial data safe with a free tool?"* | Sessions are `HttpOnly` cookies, every write is CSRF-protected, accounts are isolated from one another, destructive admin actions need a second factor, and we audit ourselves against production and publish the results. And if you'd still rather it never left your building — self-host it. |
| *"What if the project dies?"* | Export your data any time, and the code is public. A dead SaaS takes your data with it; a dead MIT project leaves you everything. |
| *"I already use [spreadsheet]."* | Spreadsheets don't chase your ageing receivables, calculate VAT live, produce a branded PDF, or tell you what's overdue before your client does. |
| *"Does it do my taxes?"* | No — it keeps your invoices, expenses and figures straight so your accountant's job is short. It isn't tax software and doesn't give tax advice. |
| *"Can I use my own branding?"* | Yes. Logo, company details, VAT number, bank details and payment terms are set once and appear on every invoice and PDF. |
| *"Why should I trust an unknown project?"* | Don't trust it — read it. Then run it on your own machine if you like. |

---

## 16. Assets & links

| Thing | Where |
|---|---|
| Landing page | https://mynvoice.com |
| App / sign-up | https://app.mynvoice.com |
| GitHub (star it) | https://github.com/AlexandreCorcos/mynvoice |
| MIT licence | https://github.com/AlexandreCorcos/mynvoice/blob/main/LICENSE |
| Issues / feature requests | https://github.com/AlexandreCorcos/mynvoice/issues |
| Buy Me a Coffee | https://buymeacoffee.com/acorcos |
| Card donation | the Stripe payment link used on the site |
| Security audit reports | `docs/Audit/` in the repo |
| Brand assets (logo, OG image, wordmark PNGs) | `frontend/public/` and `frontend/src/app/` in the repo |
| Design system reference | `CLAUDE.md` § Design System |
| **Competitor landscape** | [`COMPETITOR_LANDSCAPE.md`](COMPETITOR_LANDSCAPE.md) — who else is free, where their walls are, and the gaps we must not claim past |

**Screenshot sources for creatives:** dashboard, invoice editor (mid-drag), a
rendered PDF, the reports screen, dark mode. Use the real app — never mock up a
screen that doesn't exist.

---

## 17. Open questions for the owner

Decide these before a campaign goes out; they're choices, not facts:

1. **Language.** The product is English (UK). Campaigns in Portuguese would reach a different market the product doesn't yet speak. Run EN-only, or PT campaigns pointing at an EN product?
2. **Primary market.** UK-first (GBP default, en-GB, VAT language) or broader?
3. **The Google sign-in claim** on the landing page: remove it, or implement Google OAuth?
4. **Handles.** No official Instagram/Facebook/LinkedIn accounts are recorded in the repo — supply them so posts can cross-reference.
5. **Paid ads or organic only?** Ad copy has different length/compliance constraints.
6. **Do we ever publish donation totals?** Currently no, and the progress bar was deliberately removed.

---

*Keep this file current. If a feature ships, add it to § 6 and remove it from
§ 14 — a brief that drifts out of date starts producing false advertising.*
