# MYNVOICE — Master TODO

The running list of what's missing, why it matters, and roughly what it costs to
build. Derived from [`docs/marketing/COMPETITOR_LANDSCAPE.md`](marketing/COMPETITOR_LANDSCAPE.md) § 7 —
the gaps are ordered by **how often a competitor's *free* tier already has the
feature**, because that's what actually costs us signups.

**Effort key:** S = a day or less · M = a few days · L = a week or more · XL = a project.

> When something ships: tick it here, add it to `CAMPAIGN_BRIEF.md` § 6 (feature
> inventory) **and** remove it from § 14 (never claim this). A brief that drifts
> out of date starts producing false advertising.

---

## Tier 1 — the ones that cost us signups

### ☐ 1. Recurring invoices · **M** · *agreed as the next feature — deferred, not started*
Issue the same invoice on a schedule (weekly / monthly / quarterly / yearly).
The retainer case — the single most common freelance billing pattern. **Even
Invoice Ninja's free tier has this.**

**Product decisions to settle before building:**
- Auto-**send** on the date, or auto-**create as draft** for review? (Draft-first is safer and much easier to trust; auto-send is what people expect from "recurring".)
- End condition: never / after N occurrences / until a date?
- What happens if the client is deleted, or the schedule fires while the app is down?
- Does each generated invoice take a fresh number at generation time? (Yes — via the existing per-user advisory lock.)

**Technical notes:** needs a scheduler. The stack has no job runner today —
options are a lightweight APScheduler inside the backend, a cron container, or a
`last_run_at` check on a cheap periodic task. Generation must be **idempotent**
(a double-fire must not create two invoices for the same period).

### ☐ 2. Online payment on the invoice ("Pay now") · **S → XL, staged**
**The biggest gap. Every competitor has it.** Today a client reads the invoice
and pays by bank transfer from the details on the PDF. Full design discussion
and the staged plan are in § "Design note: online payments" below.

### ☐ 3. Quotes / estimates → invoice · **M**
Send a quote, client accepts, it becomes an invoice keeping the line items and
the numbering. Standard everywhere, including every free tier. Largely a reuse
of the invoice model with its own status set and number series.

### ☐ 4. Automated payment reminders · **M**
"Your invoice is due in 3 days / is 7 days overdue." Zoho's *free* tier chases
late payers; we don't chase at all. Needs the same scheduler as #1, plus
per-user settings (which offsets, opt-out per client/invoice) and a hard rule:
**never** mail the same reminder twice.

---

## Tier 2 — expected, and noticed when missing

- ☐ **Client portal** · **L** — a tokenised link where a client sees their invoices, downloads PDFs and (later) pays. Pairs naturally with #2.
- ☐ **Mobile app** · **XL** — we're a mobile-first *web* app. A PWA (installable, offline-ish) is a fraction of the cost of native and probably the right answer.
- ☐ **Multi-user / teams** · **XL** — blocks every small agency. **Careful:** `user_id` is currently the *only* security boundary in the system and is enforced by hand in every query (see `docs/Audit/`). Introducing an organisation layer means revisiting every one of those, and re-running audit playbook #1 afterwards. This is the highest-risk item on the list.
- ☐ **Credit notes** · **M** — a first-class way to credit an issued invoice. Currently the only workaround is cancelling, and negatives are now (correctly) rejected.
- ☐ **Attachments / receipt capture** · **M** — photograph a receipt onto an expense. R2 storage already exists for logos.

---

## Tier 3 — accounting depth we've deliberately not chased

- ☐ **Bank feeds / open banking auto-import** · **XL** — ours is CSV + manual ticking. Real cost is a provider (Plaid/TrueLayer/GoCardless), which is a *paid* dependency and cuts against "free forever" — decide the funding model before starting.
- ☐ **Purchase orders & supplier bills (AP)** · **L**
- ☐ **Double-entry accounting / general ledger** · **XL** — would change what the product *is*. Probably out of scope on purpose.
- ☐ **VAT returns filed to HMRC (Making Tax Digital)** · **XL** — a genuine blocker for UK VAT-registered businesses, and requires HMRC recognition. Strategic decision, not a sprint.
- ☐ **Payroll** · **XL** — almost certainly out of scope.
- ☐ **PEPPOL / structured e-invoicing** · **L** — becoming mandatory in parts of the EU. Worth watching.
- ☐ **Customer statements** · **S** — "here's everything you owe me", a per-client rollup. Cheap win.

---

## Tier 4 — scale and reach

- ☐ **More currencies** · **S** — only GBP/EUR/USD today. The `Money` type and per-invoice currency already exist; this is mostly a list and formatting.
- ☐ **More languages** · **M** — `en-GB` only; the i18n structure is in place and unused. **Never call the product multilingual until a second locale ships.**
- ☐ **Public API docs + integrations** · **M** — the API exists but docs are (correctly) disabled in production. A documented, versioned public API would open Zapier/n8n.
- ☐ **Accountant-facing view** · **L** — read-only access for your bookkeeper.

---

## Also worth doing (not competitor-driven)

- ☐ **Google sign-in** · **M** — schema, config and CSRF exemption exist; the route and the button do not. The dead button and the false landing claim were removed in v0.23.19. Either build it or leave it removed — don't re-advertise it first.
- ☐ **Unique constraint on `(user_id, payment_number)`** · **S** — the twin of the invoice-number constraint added in v0.23.14. Payment numbering is already protected by the advisory lock; this is the belt-and-braces DB backstop.
- ☐ **Stripe/BMC donation webhook** · **M** — donations currently land in Stripe/Buy Me a Coffee and never come back into the app, so the `donations` table stays empty. Only worth doing if a progress figure is ever wanted again (the bar was deliberately removed in v0.23.18).
- ☐ **Retire the orphan donation config** · **S** — `/admin/donations` target/message is still editable in `/sys/ctrl` but no longer displayed anywhere. Owner said leave it for now.
- ☐ **Persist product suggestions + admin view** · **S** — the in-app suggestion button (v0.23.20) is email-only on purpose: adding a table meant a migration, and the migration chain had work in flight, where a second head would have stopped `alembic upgrade head` and taken the deploy down. Once that lands, add a `feedback` table and a list in `/sys/ctrl` so nothing depends on a mail send succeeding.
- ☐ **Reconciliation SQL across all accounts in production** · **S** — needs a Coolify DB shell; the audit could only verify the audit account via the API.
- ☐ **Deactivation / stale-session test** · **S** — audit playbook #1 §7 was blocked locally by the TOTP step-up gate; never exercised end to end.

---

## Design note: online payments ("Pay now")

**What competitors mean by it:** the invoice email and PDF carry a *Pay now*
button; the client lands on a hosted card-payment page; **the money goes to the
business owner's own payment account**; a webhook then marks the invoice paid
and records the payment automatically. MYNVOICE never holds the money in any of
these designs — and must not.

Three ways to build it, in increasing order of cost:

**Option A — Payment link field.** *Effort: S.*
The user pastes their own payment link (Stripe Payment Link, PayPal.me,
Revolut, Monzo, a bank link) into settings, with an optional per-invoice
override. We render it as a *Pay now* button on the PDF, in the email and in the
app.
*Pros:* days of work; no API keys stored; no webhooks; no PCI surface; **works
identically for self-hosters**; zero new liability.
*Cons:* no auto-reconciliation (you still mark it paid), and a settings-level
link can't carry the invoice's exact amount unless the user makes one link per
invoice.

**Option B — Bring-your-own Stripe key.** *Effort: M.*
User pastes a restricted Stripe key; we create a Checkout Session per invoice
with the right amount and reference; a webhook marks it paid.
*Pros:* exact amounts, real auto-reconciliation.
*Cons:* **we would be storing other people's payment credentials** — encryption
at rest, rotation, and a nasty blast radius if the database ever leaked. Given
that account isolation is hand-enforced here, this materially raises the stakes
of any future bug. **Not recommended.**

**Option C — Stripe Connect (OAuth).** *Effort: L–XL.*
"Connect your Stripe account" via OAuth; we hold an account id and token, never
raw keys; charges are created *on behalf of* the connected account with a **0%
application fee**; webhooks auto-record the payment and mark the invoice paid.
*Pros:* what FreshBooks and Invoice Ninja do; exact amounts; real
reconciliation; no card data ever touches us; we still take 0%.
*Cons:* requires a Stripe platform account and its compliance obligations, and
**self-hosters would each need their own platform registration** — an awkward
fit for an MIT project. Needs a config switch so self-hosted instances fall back
to Option A.

**Recommendation:** ship **A now** (it delivers the perceived benefit — the
client can click and pay — for a fraction of the cost and none of the risk),
and treat **C** as the real answer once there's demand, keeping A as the
self-host fallback. Skip B entirely.

**Non-negotiables whichever path is taken:**
- Card details never touch our servers or our database — always a hosted page.
- The money goes to the user's account, never through ours.
- **MYNVOICE takes 0%** — this is a brand promise, not a pricing decision, and it's a stronger claim than any competitor can make.
