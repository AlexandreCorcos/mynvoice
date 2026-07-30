"use client";

/* =========================================================================
   The two thin bands that sit between the big sections.

   `Ticker` closes the graphite hero with a slow-moving list of capabilities
   that speeds up as you scroll. `Proof` opens the light half of the page
   with four numbers that count themselves in.
   ========================================================================= */

import { CountUp, Marquee, Reveal } from "./primitives";

const CAPABILITIES = [
  "Unlimited invoices",
  "Expense tracking",
  "Multi-currency",
  "PDF + email delivery",
  "Client records",
  "Receivables ageing",
  "Drag-to-reorder items",
  "Self-hostable",
  "No ads, ever",
];

export function Ticker() {
  return (
    <div className="relative isolate overflow-hidden border-b border-white/[0.07] bg-graphite py-5">
      <Marquee baseVelocity={-1.8} repeat={3} className="fade-x">
        {CAPABILITIES.map((c) => (
          <span key={c} className="flex items-center">
            <span className="whitespace-nowrap px-7 font-display text-xl text-white/45 sm:text-2xl">
              {c}
            </span>
            <span className="h-1.5 w-1.5 rotate-45 bg-brass-on-dark/60" />
          </span>
        ))}
      </Marquee>
    </div>
  );
}

type Stat = {
  to: number;
  prefix?: string;
  suffix?: string;
  label: string;
  note: string;
};

const STATS: Stat[] = [
  { to: 100, suffix: "%", label: "Free & open source", note: "MIT licensed, forever" },
  { to: 60, prefix: "<", suffix: "s", label: "To your first invoice", note: "Sign-up to sent" },
  { to: 0, label: "Ads or upsells", note: "Not now, not later" },
  { to: 3, label: "Currencies built in", note: "GBP · EUR · USD" },
];

export function Proof() {
  return (
    <section className="relative border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-5 py-14 sm:gap-y-0 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
            <div className="relative">
              {i > 0 ? (
                <span className="absolute -left-4 top-1 hidden h-[calc(100%-0.5rem)] w-px bg-line lg:block lg:-left-8" />
              ) : null}
              <p className="font-display text-[2.75rem] leading-none tracking-tight text-ink">
                {s.prefix}
                <CountUp to={s.to} suffix={s.suffix} duration={1.8} />
              </p>
              <p className="mt-2.5 text-[13px] font-semibold text-ink">{s.label}</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">{s.note}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
