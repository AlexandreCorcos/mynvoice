"use client";

/* =========================================================================
   Pricing — one number, and the honest reason it can stay that way.

   The card sits on graphite with a slow brass sweep tracing its edge. The
   donation rail underneath is the real story: this is free because people
   chip in for the servers, not because there's a paid tier waiting.
   ========================================================================= */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Heart, ShieldCheck } from "lucide-react";
import {
  Aurora,
  CountUp,
  EASE_OUT,
  Eyebrow,
  Grain,
  MaskText,
  Magnetic,
  Reveal,
  ShimmerBorder,
} from "./primitives";

const INCLUDED = [
  "Unlimited invoices & clients",
  "Expense tracking with your categories",
  "Branded PDF + email delivery",
  "Dashboard, reports & receivables ageing",
  "Multi-currency (GBP · EUR · USD)",
  "Google sign-in & secure sessions",
];

/* Donation progress. Illustrative figures until Stripe is wired up. */
const RAISED = 420;
const TARGET = 1000;

export function Pricing() {
  const pct = Math.round((RAISED / TARGET) * 100);

  return (
    <section id="pricing" className="relative isolate overflow-hidden bg-graphite py-24 lg:py-32">
      <Aurora className="opacity-70" />
      <Grain opacity={0.045} />

      <div className="relative mx-auto max-w-4xl px-5 text-center">
        <Reveal>
          <Eyebrow tone="dark" className="justify-center">
            Pricing
          </Eyebrow>
        </Reveal>

        <MaskText
          as="h2"
          className="mt-5 text-[clamp(2.2rem,5.4vw,3.8rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-white"
          words={[
            "Free.",
            "Forever.",
            {
              w: "Genuinely.",
              className: "font-display font-normal italic text-brass-on-dark",
            },
          ]}
        />

        <Reveal delay={0.15}>
          <p className="mx-auto mt-5 max-w-xl text-[16.5px] leading-relaxed text-white/55">
            No tiers, no trial clock, no feature held hostage behind an upgrade
            button. Every person who signs up gets the whole product.
          </p>
        </Reveal>

        <Reveal delay={0.22} className="mt-12">
          <ShimmerBorder radius="26px" duration={9}>
            <div className="relative overflow-hidden rounded-[24px] bg-[#171513] p-8 text-left sm:p-10">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                    Every feature, every account
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-[clamp(3.5rem,9vw,5.5rem)] leading-none text-white">
                      £0
                    </span>
                    <span className="text-sm text-white/40">
                      / month
                      <br />
                      forever
                    </span>
                  </div>
                </div>

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
              </div>

              <div className="mt-9 h-px w-full bg-white/[0.08]" />

              <ul className="mt-7 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {INCLUDED.map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.06, ease: EASE_OUT }}
                    className="flex items-start gap-3 text-[14px] text-white/70"
                  >
                    <span className="mt-0.5 flex h-4.5 w-4.5 flex-none items-center justify-center rounded-full bg-brass-on-dark/12 ring-1 ring-brass-on-dark/25">
                      <Check className="h-2.5 w-2.5 text-brass-on-dark" />
                    </span>
                    {f}
                  </motion.li>
                ))}
              </ul>
            </div>
          </ShimmerBorder>
        </Reveal>

        {/* ── the honest bit ──────────────────────────────────────── */}
        <Reveal delay={0.3} className="mt-8">
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-6 text-left backdrop-blur sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brass-on-dark/12 text-brass-on-dark ring-1 ring-brass-on-dark/20">
                <Heart className="h-4 w-4" />
              </span>
              <p className="text-[14.5px] font-semibold text-white">
                Servers aren&apos;t free — but your invoicing is.
              </p>
            </div>

            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/50">
              MYNVOICE runs on donations. If it saves you an afternoon of
              spreadsheet wrangling, you can chip in towards the hosting bill —
              and if you can&apos;t, use it anyway. That&apos;s the deal.
            </p>

            <div className="mt-6">
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-semibold text-white">
                  <CountUp to={RAISED} prefix="£" duration={1.6} />
                  <span className="text-white/40">
                    {" "}
                    of £{TARGET.toLocaleString("en-GB")} monthly cost covered
                  </span>
                </span>
                <span className="font-semibold text-brass-on-dark">{pct}%</span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <motion.span
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, delay: 0.2, ease: EASE_OUT }}
                  className="block h-full rounded-full bg-gradient-to-r from-brass to-brass-on-dark"
                />
              </div>
            </div>

            <Link
              href="/support"
              className="group mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white/75 transition-colors hover:text-white"
            >
              Support the project
              <ArrowRight className="h-3.5 w-3.5 text-brass-on-dark transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.36}>
          <p className="mt-7 inline-flex items-center gap-2 text-[12.5px] text-white/35">
            <ShieldCheck className="h-4 w-4 text-brass-on-dark/70" />
            Your data stays yours. Export it or self-host it whenever you like.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
