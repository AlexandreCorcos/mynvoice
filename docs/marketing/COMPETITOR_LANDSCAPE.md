# Competitor Landscape — invoicing & small-business finance

**Researched: 26 August 2026.** Companion to [`CAMPAIGN_BRIEF.md`](CAMPAIGN_BRIEF.md).

> ⚠️ **Before you publish any price comparison in an ad or post, re-check it on
> the competitor's own pricing page that day.** Prices move constantly, differ by
> country, and are often quoted ex-VAT or behind a promo. Some figures below come
> from third-party trackers where the official page was unreachable — those are
> marked. Naming a competitor and getting their price wrong is a legal and
> reputational risk; § 8 explains the safer way to say it.

---

## 1. The one-page takeaway

Free invoicing exists — but **every free tier has a wall**, and the wall is
almost always one of four things:

| The wall | Who does it |
|---|---|
| **Caps the invoices** | Zoho Invoice (500/year) · Xero Ignite (20/month) |
| **Caps the clients** | Invoice Ninja free (5) · FreshBooks Lite (5) |
| **Puts their brand on your invoice** | Zoho Invoice free ("Powered by Zoho Invoice") · PayPal |
| **Isn't really free — it's payment fees** | PayPal · Stripe · Square · Wave |

**MYNVOICE hits none of those four.** Unlimited invoices, unlimited clients,
your branding only, and no cut of your money — because we don't process
payments at all.

But that last point is also our biggest hole: **your client can't click "Pay
now" on a MYNVOICE invoice.** Almost every competitor can. See § 7 — that
section matters more than the rest of this document.

**The honest one-liner:** we win decisively on *"free with no wall and no
lock-in"*, and we lose on *"gets you paid faster and does your accounting"*.

---

## 2. Master comparison

| Product | Price | Free tier? | The catch on the free tier | Open source |
|---|---|---|---|---|
| **MYNVOICE** | **£0** | **Everything, forever** | **None — no paid tier exists** | **✅ MIT** |
| **Zoho Invoice** | Free | Yes, genuinely | 500 invoices/yr · 2 users · 3 projects · **their branding on your invoice** | ❌ |
| **Wave** | Starter £0 / Pro $19 mo | Yes | Payment fees 2.9%+$0.60 · bank import & reminders are Pro · **US/Canada-centric** | ❌ |
| **Invoice Ninja** | Free / Pro $14 mo / Ent. $18+ mo | Yes | **5 clients** on free | **✅ self-hostable free** |
| **Akaunting** | Free core + paid apps | Self-host free | Many features are paid add-on "apps" | ✅ |
| **Crater** | Free | Self-host free | Small project, fewer features | ✅ |
| **InvoicePlane** | Free | Self-host free | Dated UI, LAMP setup, few integrations | ✅ |
| **PayPal Invoicing** | £0 software | Yes | **2.99% + 49¢** per payment · PayPal branding | ❌ |
| **Stripe Invoicing** | £0 software | Yes | **+0.4–0.5% per paid invoice** on top of 2.9%+30¢ | ❌ |
| **Square Invoices** | Free plan | Yes | ~3.3% + 30¢ on invoice card payments | ❌ |
| **FreshBooks** | $23 / $43 / $70 mo | ❌ 30-day trial | **Lite caps 5 clients** · +$11/mo per extra user | ❌ |
| **Xero (UK)** | £16 / £37 / £50 / £65 mo | ❌ trial only | **Ignite caps 20 invoices + 10 bills a month** | ❌ |
| **QuickBooks (UK)** | £10 sole trader / £38 Essentials | ❌ trial only | Promo pricing then full list | ❌ |
| **Sage (UK)** | ~£12–18 / £25–39 / £36–59 mo | ❌ trial only | Payroll only on the top plan | ❌ |

*UK prices are typically quoted ex-VAT. FreshBooks/Wave/Invoice Ninja in USD.*

---

## 3. The free competitors (our real rivals)

### 3.1 Zoho Invoice — the one to take seriously
**Price:** genuinely free. Zoho dropped the price tag in 2022 "as a gesture to
give back to the small business community" and commits to staying free and
ad-free.

**What it does that we don't:** quotes/estimates that auto-convert to invoices,
**online payment acceptance**, **automated payment reminders**, **a customer
portal**, **time tracking**, projects, WhatsApp/iMessage delivery, many
currencies and languages, mobile apps.

**Its walls:** **500 invoices per year**, **2 users**, **3 projects**, and —
the big one — **"Powered by Zoho Invoice" branding on the invoices you send
your clients**.

**How to beat it:** unlimited invoices, and *your* brand on your invoice, not
ours. Also: it's a closed product inside a giant ecosystem designed to pull you
into paid Zoho Books; we're MIT and you can walk away with the code.

> This is the strongest free competitor by feature count. Do not pretend
> otherwise — beat it on the two things it genuinely gets wrong.

### 3.2 Wave — free, but North-American and fee-funded
**Price:** Starter free (unlimited invoices, estimates, bookkeeping); Pro $19/mo
adds bank auto-import, receipt capture, automated late-payment reminders and
branding removal. Payments: 2.9% + $0.60 per card transaction.

**Walls:** Wave is built around **US/Canada** (payroll is US/CA only, features
and bank connections are optimised for North America). The "free" is funded by
payment processing.

**How to beat it:** we work anywhere, and there's no processing cut because we
don't touch your money — you get paid straight to your bank.

### 3.3 Invoice Ninja — our closest philosophical rival
**Price:** free forever for **5 clients** with unlimited invoicing; Pro $14/mo
for unlimited clients; Enterprise from $18/mo for multi-user. **Open source and
free to self-host.**

**What it does that we don't:** recurring invoices *(even on free)*, client
portal, payment gateway integrations, quotes, API access, PEPPOL e-invoicing,
multi-user, many templates.

**Its wall:** **5 clients** on the hosted free plan — you hit that fast.

**How to beat it:** unlimited clients on our hosted free tier, and a
considerably more modern interface. Be respectful here: they're open source
too, and a chunk of our audience likes them. Compete on the client cap and the
design, never by disparaging them.

### 3.4 The other open-source options
- **Akaunting** — full double-entry accounting suite, self-host free, but many capabilities are **paid add-on "apps"**.
- **Crater** — clean, modern, small; invoices, estimates, expenses, payments.
- **InvoicePlane** — lightweight PHP/LAMP, runs anywhere cheap; dated UI, few integrations.

**How to beat them:** design quality and the fact that we run a maintained
hosted instance for free *and* let you self-host. Most of these are self-host
only, which excludes every non-technical user.

### 3.5 Payment-processor invoicing (PayPal · Stripe · Square)
Not really invoicing products — they're payment products with an invoice
attached. Free software, paid per transaction: **PayPal 2.99% + 49¢**,
**Stripe 2.9% + 30¢ plus another 0.4–0.5% per paid invoice**, **Square ~3.3% +
30¢** on invoice card payments.

**What they do that we don't:** the client pays instantly by card, and the
money reconciles itself.

**How to beat them:** they take a percentage of *every* invoice forever, they
brand the invoice, and they hold no record of your expenses, reports or
month-end. For a £3,000 invoice, Stripe's cut is roughly £87. Ours is £0.

---

## 4. The paid incumbents

| | What they're really selling |
|---|---|
| **FreshBooks** ($23–$70/mo) | Freelancer-friendly invoicing + time tracking. **Lite caps you at 5 billable clients**, and every extra team member is +$11/mo. |
| **Xero** (£16–£65/mo UK) | Full accounting for accountants. **The £16 Ignite plan allows just 20 invoices and 10 bills a month.** Price rises confirmed from 1 Sept 2026. |
| **QuickBooks** (£10–£38/mo UK) | The market default. Heavy promo discounting, then full list price. |
| **Sage** (~£12–£59/mo UK) | UK incumbent, strong on VAT/payroll. Payroll only on the top tier. |

**What they all do that we don't:** bank feeds, VAT returns filed to HMRC
(Making Tax Digital), double-entry accounting, purchase orders and supplier
bills, payroll, receipt capture, mobile apps, huge integration marketplaces,
multi-user with roles, and an accountant-facing view.

**How to beat them:** we are not trying to be them. They sell *accounting
compliance*; we sell *getting an invoice out the door and knowing where you
stand*. For a freelancer sending 10 invoices a month, Xero Ignite's 20-invoice
cap at £16/mo (≈£192/yr) buys less invoicing capability than our £0.

---

## 5. Where MYNVOICE genuinely wins

1. **The only one with no wall at all.** Unlimited invoices *and* unlimited clients *and* unlimited value, free. Every other free tier caps one of those.
2. **Your branding, not ours.** Zoho's free plan stamps "Powered by Zoho Invoice" on your client's invoice. PayPal brands it too. We never do.
3. **We take 0% of your money.** No processing cut, because payments go straight to your bank.
4. **MIT licensed and self-hostable.** Zoho, Wave, FreshBooks, Xero, QuickBooks and Sage are all closed. If we ever turned hostile, you could fork the last free version — that's a guarantee none of them can offer.
5. **No paid tier exists**, so there is no upsell pressure and no future paywall to migrate off.
6. **Month-end closing with drift detection** — snapshot a period, get told if the figures move afterwards. Rare even in paid tools.
7. **Bank reconciliation included** at £0 (manual ticking + CSV import).
8. **Published security audits.** We audit against production and publish the findings, including our own bugs. **No competitor on this list does that.**
9. **Design.** Most free tools look free. This one doesn't.
10. **Geography-agnostic** — no US/Canada restriction like Wave.

---

## 6. Feature scorecard

✅ ships · ⚠️ partial · ❌ absent

| | MYNVOICE | Zoho Inv. | Wave | Invoice Ninja | Xero/QB/Sage |
|---|---|---|---|---|---|
| Unlimited invoices free | ✅ | ❌ 500/yr | ✅ | ✅ | ❌ |
| Unlimited clients free | ✅ | ✅ | ✅ | ❌ 5 | ❌ |
| No vendor branding | ✅ | ❌ | ⚠️ Pro | ✅ | ✅ |
| Custom branded PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| Expenses | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reports & dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-currency | ⚠️ 3 | ✅ many | ⚠️ | ✅ | ✅ |
| Bank reconciliation | ⚠️ manual | ⚠️ | ✅ Pro | ✅ | ✅ |
| Month-end closing | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| Self-hostable | ✅ | ❌ | ❌ | ✅ | ❌ |
| Open source | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Online payment on invoice** | **❌** | ✅ | ✅ | ✅ | ✅ |
| **Recurring invoices** | **❌** | ✅ | ✅ | ✅ | ✅ |
| **Quotes / estimates** | **❌** | ✅ | ✅ | ✅ | ✅ |
| **Automated reminders** | **❌** | ✅ | ✅ Pro | ✅ | ✅ |
| **Client portal** | **❌** | ✅ | ⚠️ | ✅ | ✅ |
| **Mobile app** | **❌** | ✅ | ✅ | ✅ | ✅ |
| **Multi-user / teams** | **❌** | ⚠️ 2 | ✅ | ✅ Ent. | ✅ |
| **Bank feeds (auto)** | **❌** | ❌ | ✅ Pro | ✅ Ent. | ✅ |
| **VAT/MTD filing** | **❌** | ❌ | ❌ | ❌ | ✅ |
| Time tracking | ❌ | ✅ | ❌ | ✅ | ⚠️ |
| Purchase orders / bills | ❌ | ⚠️ | ✅ | ✅ | ✅ |

---

## 7. ⚠️ The honest gap list — what MYNVOICE does NOT do

Marketing must never claim these (they're already in `CAMPAIGN_BRIEF.md` § 14),
and product should read this as a roadmap. Ordered by how often a competitor's
free tier has it:

**Tier 1 — the ones that cost us signups**
1. **Online payment on the invoice** — no "Pay now" button; your client pays by bank transfer using the details on the PDF. *Every* competitor has this. **The single biggest gap.**
2. **Recurring invoices** — even Invoice Ninja's free tier has them; retainer-based freelancers will bounce off this.
3. **Quotes / estimates** that convert to an invoice — standard everywhere.
4. **Automated payment reminders** — Zoho's free tier chases late payers; we don't.

**Tier 2 — expected, and noticed when missing**
5. **Client portal** — clients can't log in to see their invoices.
6. **Mobile app** — we're a mobile-first *web* app; no App Store presence.
7. **Multi-user / teams** — one account, one person. Blocks any small agency.
8. **Credit notes** — no first-class way to credit an issued invoice.
9. **Attachments / receipt capture** — no photographing a receipt.

**Tier 3 — accounting depth we've deliberately not chased**
10. Bank feeds / open banking auto-import (ours is CSV + manual ticking)
11. Purchase orders and supplier bills (accounts payable)
12. Double-entry accounting / general ledger
13. **VAT returns filed to HMRC (Making Tax Digital)** — a real blocker for UK VAT-registered businesses
14. Payroll
15. PEPPOL / structured e-invoicing
16. Customer statements

**Tier 4 — scale and reach**
17. Only **GBP, EUR, USD**; only **English (UK)**
18. No public API docs, no integration marketplace, no Zapier
19. No accountant-facing view

---

## 8. What this means for the campaigns

**Lead with the wall, not the feature list.** Our advantage is structural, not
functional. The strongest hooks:
- *"Free until invoice 501. Or free, full stop."* (Zoho's cap)
- *"£16 a month for 20 invoices. Or £0 for as many as you like."* (Xero Ignite)
- *"Their free plan puts their logo on your invoice. Ours puts yours."*
- *"Stripe takes 2.9% of every invoice. We take 0%, because we never touch your money."*
- *"Free with 5 clients isn't free. It's a trial with extra steps."*

**Target the moment someone hits a wall.** People search "Zoho Invoice 500
limit", "FreshBooks 5 client limit", "Xero cheaper alternative", "free
invoicing unlimited". That's the highest-intent audience we have.

**Own the ground nobody contests:** open source + self-hostable + published
security audits + no payment cut. Zoho and Wave cannot copy this without
changing their business model.

**Be upfront about the payment gap.** If someone asks "can my client pay by
card?", the answer is *"not yet — invoices carry your bank details and payments
are recorded manually"*. Saying it plainly costs one signup; being caught
overpromising costs the brand. Never imply a Pay-now button exists.

**Rules for competitive copy**
- Prefer describing the **pattern** ("free tiers that stop at 500 invoices") over naming a company. Safer legally, and it doesn't read as bitter.
- If you *do* name one, use only **verifiable, current, official** figures and say when you checked.
- Never call a competitor a scam or a rip-off. Zoho giving away a real product deserves respect; our argument is about the cap and the branding, not their integrity.
- Never compare on features we don't have.

---

## 9. Sources

Official pages: [Zoho Invoice](https://www.zoho.com/invoice/) · [Zoho Invoice pricing/FAQ](https://www.zoho.com/invoice/pricing/) · [Wave pricing](https://www.waveapps.com/pricing) · [Invoice Ninja pricing](https://invoiceninja.com/pricing-plans/)

Third-party trackers (official page unreachable or region-specific — **re-verify before publishing**): [Xero UK pricing](https://www.xero.com/uk/pricing-plans/) · [Xero UK 2026 breakdown](https://marcandrews.com/xero-pricing-uk-2026-every-plan-explained-in-gbp/) · [FreshBooks pricing](https://costbench.com/software/accounting/freshbooks/) · [QuickBooks UK pricing](https://www.expertmarket.com/uk/accounting/quickbooks-pricing) · [Sage UK pricing](https://startups.co.uk/accounting/sage-business-cloud-accounting-review/) · [Stripe/PayPal/Square invoicing fees](https://payrequest.io/blog/paypal-vs-stripe-invoicing-2026) · [Self-hosted open-source roundup](https://selfhosting.sh/best/invoicing/)

---

*Re-run this research every few months. Pricing and free-tier limits are the
most volatile facts in this document, and they are exactly the ones we build
campaign hooks from.*
