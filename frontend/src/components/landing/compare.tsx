"use client";

/* =========================================================================
   /compare — where MYNVOICE fits among the invoicing tools people look at.

   Deliberately NOT a head-to-head. No tick tables, no "we win" columns, no
   claims about what another product does or doesn't do beyond a neutral
   sentence describing what it is. Two reasons: a tick table ages into a lie
   within a quarter, and a page that rubbishes the competition reads as
   insecurity. What this page does is orient someone who is shopping around,
   name the tools they are probably weighing, and say plainly what MYNVOICE is
   — which is also what earns the search traffic.

   Section rhythm follows the landing page: graphite → light → graphite.
   ========================================================================= */

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Coffee,
  CreditCard,
  FileCode2,
  Github,
  Infinity as InfinityIcon,
  Lock,
  PoundSterling,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Aurora,
  Eyebrow,
  Grain,
  Magnetic,
  MaskText,
  Reveal,
  ShimmerBorder,
} from "./primitives";

const BMAC_URL = process.env.NEXT_PUBLIC_BMAC_URL;
const STRIPE_URL = process.env.NEXT_PUBLIC_STRIPE_URL;

/* Why people choose MYNVOICE — each one true today, none on a roadmap. */
const PILLARS = [
  {
    icon: InfinityIcon,
    title: "Nothing is capped",
    body: "Unlimited invoices, unlimited clients, every feature, on every account. There is no plan above this one, because there is no paid plan at all.",
  },
  {
    icon: PoundSterling,
    title: "We take 0% of your money",
    body: "MYNVOICE never touches a payment. Your client pays you directly using the bank details on your invoice, so nothing is skimmed off the top.",
  },
  {
    icon: FileCode2,
    title: "Open source, MIT licensed",
    body: "The entire source is public. If we ever changed the deal, anyone could fork the last free version and carry on — the licence is the guarantee, not our word.",
  },
  {
    icon: ShieldCheck,
    title: "Security we publish",
    body: "Sessions in HttpOnly cookies, CSRF protection on every write, and accounts isolated from one another. We audit against production and publish the findings, our own bugs included.",
  },
  {
    icon: Lock,
    title: "Your data stays yours",
    body: "Export it whenever you like, or run the whole thing on your own hardware with the same Docker setup we use. No ads, no resale — your data is not the business model.",
  },
  {
    icon: Sparkles,
    title: "Your branding, never ours",
    body: "Your logo and company details on every invoice and PDF. We never stamp our own name on the document your client receives.",
  },
];

/* The tools people weigh up. Neutral one-line descriptions of what each one
   is — no claims about limits, prices or shortcomings, which move constantly
   and would need re-checking on the day anyone read them. */
const LANDSCAPE = [
  {
    group: "Free and freemium invoicing",
    items: [
      { name: "Zoho Invoice", note: "Free invoicing from the Zoho suite." },
      { name: "Wave", note: "Free invoicing and bookkeeping, centred on North America." },
      { name: "Square Invoices", note: "Invoicing attached to Square's card payments." },
      { name: "Invoicely", note: "Lightweight online invoicing with a free tier." },
      { name: "Zervant", note: "Invoicing aimed at European small businesses." },
    ],
  },
  {
    group: "Open source and self-hosted",
    items: [
      { name: "Invoice Ninja", note: "Open-source invoicing, hosted or self-hosted." },
      { name: "Akaunting", note: "Open-source accounting suite with an app store." },
      { name: "Crater", note: "Modern open-source invoicing for small businesses." },
      { name: "InvoicePlane", note: "Lightweight self-hosted invoicing on PHP." },
      { name: "Odoo", note: "Open-source business suite with an invoicing module." },
    ],
  },
  {
    group: "Accounting platforms",
    items: [
      { name: "QuickBooks", note: "Full accounting software, widely used by accountants." },
      { name: "Xero", note: "Full accounting software with a large app marketplace." },
      { name: "Sage", note: "Long-established accounting software in the UK." },
      { name: "FreshBooks", note: "Invoicing and time tracking aimed at freelancers." },
      { name: "Bonsai", note: "Contracts, proposals and invoicing for freelancers." },
    ],
  },
  {
    group: "Invoicing inside payment processors",
    items: [
      { name: "Stripe Invoicing", note: "Invoices issued from a Stripe account." },
      { name: "PayPal Invoicing", note: "Invoices issued from a PayPal business account." },
      { name: "GoCardless", note: "Direct debit collection for recurring payments." },
    ],
  },
];

const HONESTY = [
  "We describe other tools neutrally and never claim they are worse. What they cost and what they include changes constantly — check their own pricing pages, which are the only source worth trusting on that.",
  "We do not publish tick tables. A grid of green ticks is out of date within a quarter and quietly becomes a lie.",
  "We are open about what MYNVOICE does not do yet: there is no Pay-now button on the invoice, no recurring invoices, no quotes, no automated reminders, no mobile app and no VAT filing.",
  "Everything we say about our own product is in the public source, so you can check it rather than take our word for it.",
];

export function CompareContent() {
  return (
    <>
      {/* ── Hero (graphite) ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-graphite py-24 lg:py-32">
        <Aurora className="opacity-70" />
        <Grain opacity={0.045} />

        <div className="relative mx-auto max-w-4xl px-5 text-center">
          <Reveal>
            <Eyebrow tone="dark" className="justify-center">
              Invoicing software
            </Eyebrow>
          </Reveal>

          <MaskText
            as="h1"
            className="mt-5 text-[clamp(2.1rem,5.2vw,3.6rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-white"
            words={[
              "Shopping",
              "around?",
              {
                w: "Here's",
                className: "font-display font-normal italic text-brass-on-dark",
              },
              {
                w: "where",
                className: "font-display font-normal italic text-brass-on-dark",
              },
              {
                w: "we",
                className: "font-display font-normal italic text-brass-on-dark",
              },
              {
                w: "fit.",
                className: "font-display font-normal italic text-brass-on-dark",
              },
            ]}
          />

          <Reveal delay={0.15}>
            <p className="mx-auto mt-6 max-w-2xl text-[16.5px] leading-relaxed text-white/55">
              There are a lot of good invoicing tools. This page is not a
              scoreboard — we are not going to tell you what anyone else is
              worth. It is simply an honest description of what MYNVOICE is, so
              you can tell in a minute whether it is the one you want.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Magnetic strength={0.2}>
                <Link
                  href="/register"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-4 text-sm font-semibold text-graphite"
                >
                  <span className="absolute inset-0 -z-10 translate-y-full bg-brass-on-dark transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
                  Create your free account
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <a
                href="#landscape"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-4 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/[0.06]"
              >
                See the tools people look at
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The frame (light) ───────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <Reveal>
            <div>
              <h2 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
                One number worth checking first
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
                Most invoicing tools have a free tier, and most free tiers stop
                somewhere — a number of invoices, a number of clients, a logo on
                the document, or a percentage of the payment. Wherever you are
                looking, the useful question is the same:{" "}
                <span className="font-semibold text-ink">
                  where does this one stop, and what happens then?
                </span>
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
                With MYNVOICE the answer is that it doesn&apos;t. There is no
                paid plan to graduate to and no billing code in the repository,
                which is the sort of claim you can check for yourself rather
                than believe.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <ShimmerBorder radius="20px" duration={9}>
              <div className="rounded-[18px] bg-graphite p-7 text-left sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Every feature, every account
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-[clamp(3rem,8vw,4.5rem)] leading-none text-white">
                    £0
                  </span>
                  <span className="text-sm text-white/40">
                    / month
                    <br />
                    forever
                  </span>
                </div>
                <div className="mt-6 h-px w-full bg-white/[0.08]" />
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Unlimited invoices and clients",
                    "Your branding on every PDF",
                    "0% taken from your payments",
                    "MIT licensed — self-host it if you like",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-white/70">
                      <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-brass-on-dark" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </ShimmerBorder>
          </Reveal>
        </div>
      </section>

      {/* ── Pillars (light) ─────────────────────────────────────── */}
      <section className="bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <Reveal>
            <Eyebrow>Why people choose it</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
              Six reasons, all true today
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              Nothing here is on a roadmap. If it is written on this page, it
              works in the product right now.
            </p>
          </Reveal>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={0.06 * i}>
                <div className="h-full rounded-[16px] border border-line bg-card p-6 transition-colors hover:border-brass-soft/50">
                  <p.icon className="h-5 w-5 text-brass-ink" strokeWidth={2} />
                  <h3 className="mt-3.5 text-[16px] font-bold tracking-[-0.015em] text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The landscape (graphite) — the names, described neutrally ── */}
      <section
        id="landscape"
        className="relative isolate scroll-mt-20 overflow-hidden border-y border-line bg-graphite py-16 lg:py-20"
      >
        <Aurora className="opacity-40" />
        <Grain opacity={0.04} />

        <div className="relative mx-auto max-w-5xl px-5">
          <Reveal>
            <Eyebrow tone="dark">The landscape</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
              The tools people usually look at
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/55">
              If you are choosing invoicing software, these are the names that
              come up. We have described each one plainly and left it there —
              what they cost and what they include changes often, so their own
              pricing pages are the only source worth trusting on that.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {LANDSCAPE.map((section, gi) => (
              <Reveal key={section.group} delay={0.06 * gi}>
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-brass-on-dark">
                    {section.group}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {section.items.map((item) => (
                      <li
                        key={item.name}
                        className="border-l-2 border-white/[0.08] pl-4 transition-colors hover:border-brass-on-dark/50"
                      >
                        <span className="block text-[14.5px] font-semibold text-white">
                          {item.name}
                        </span>
                        <span className="block text-[13px] leading-relaxed text-white/45">
                          {item.note}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="mt-10 text-[12.5px] leading-relaxed text-white/35">
              All product names and trademarks are the property of their
              respective owners. MYNVOICE is not affiliated with, endorsed by or
              sponsored by any of the products listed above, and none of them
              are compared here.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Honesty method (light) ──────────────────────────────── */}
      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <Reveal>
            <Eyebrow>Our method</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
              How we talk about other tools
            </h2>
          </Reveal>
          <ul className="mt-7 space-y-4">
            {HONESTY.map((item, i) => (
              <Reveal key={item} delay={0.06 * i}>
                <li className="flex items-start gap-3 text-[14.5px] leading-relaxed text-ink-muted">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 flex-none text-brass-ink"
                    strokeWidth={2}
                  />
                  <span>{item}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing CTA (graphite) ──────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-graphite py-20">
        <Aurora className="opacity-60" />
        <Grain opacity={0.045} />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
            Try it with your own invoice
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/55">
            No card, no trial clock, nothing to cancel. Send one real invoice
            and see whether it is better than what you use now.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Magnetic strength={0.2}>
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-4 text-sm font-semibold text-graphite"
              >
                <span className="absolute inset-0 -z-10 translate-y-full bg-brass-on-dark transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
                Create your free account
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <a
              href="https://github.com/AlexandreCorcos/mynvoice"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-4 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/[0.06]"
            >
              <Github className="h-4 w-4" />
              Read the source
              <ArrowUpRight className="h-3.5 w-3.5 text-brass-on-dark" />
            </a>
          </div>

          {(BMAC_URL || STRIPE_URL) && (
            <p className="mt-8 text-[12.5px] text-white/35">
              Free because people chip in —{" "}
              {BMAC_URL && (
                <a
                  href={BMAC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  <Coffee className="h-3.5 w-3.5" />
                  buy me a coffee
                </a>
              )}
              {BMAC_URL && STRIPE_URL && " or "}
              {STRIPE_URL && (
                <a
                  href={STRIPE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  donate by card
                </a>
              )}
              .
            </p>
          )}
        </div>
      </section>
    </>
  );
}
