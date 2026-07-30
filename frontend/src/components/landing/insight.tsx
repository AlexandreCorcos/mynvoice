"use client";

/* =========================================================================
   Dashboard section.

   The card unfolds as you scroll — it starts tipped back in 3D space and
   lays flat as it reaches the middle of the viewport, which reads as the
   product opening up rather than merely sliding in.
   ========================================================================= */

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import {
  CountUp,
  EASE_OUT,
  Eyebrow,
  MaskText,
  Reveal,
  useCalmMotion,
} from "./primitives";

const POINTS = [
  "Revenue against expenses, month by month",
  "Receivables ageing before your client notices",
  "Paid, unpaid and overdue as three honest numbers",
  "Expense categories that you define, not us",
];

const EXPENSE_BARS = [26, 22, 31, 19, 34, 28, 24, 30, 21, 27, 25, 33];

/* Revenue as a drawn area line, expenses as the quiet neutral bars beneath
   it. Two series, one axis — brass carries the meaning, grey carries the
   context, and nothing needs a rainbow. */
function RevenueChart() {
  const path =
    "M0 96 L36 84 L72 88 L108 62 L144 68 L180 44 L216 50 L252 26 L288 32 L324 12";
  const area = `${path} L324 120 L0 120 Z`;

  return (
    <div className="relative h-[132px] w-full">
      {/* expenses, behind */}
      <div className="absolute inset-0 flex items-end gap-1.5">
        {EXPENSE_BARS.map((h, i) => (
          <motion.span
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 + i * 0.05, ease: EASE_OUT }}
            className="w-full rounded-t-[3px] bg-ink-muted/[0.18]"
          />
        ))}
      </div>

      <svg viewBox="0 0 324 120" preserveAspectRatio="none" className="relative h-full w-full">
        <defs>
          <linearGradient id="mv-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brass)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brass)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 30, 60, 90].map((y) => (
          <line key={y} x1="0" y1={y} x2="324" y2={y} stroke="var(--line)" strokeWidth="1" />
        ))}

        <motion.path
          d={area}
          fill="url(#mv-area)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.7 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="var(--brass)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: EASE_OUT }}
        />
      </svg>

      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.5, duration: 0.5, ease: EASE_OUT }}
        className="absolute right-0 top-[10%] flex h-3 w-3 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-brass ring-4 ring-card"
      />
    </div>
  );
}

export function Insight() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useCalmMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const rotateX = useTransform(smooth, [0, 1], [16, 0]);
  const yLift = useTransform(smooth, [0, 1], [56, 0]);
  const scale = useTransform(smooth, [0, 1], [0.93, 1]);

  return (
    <section id="insight" className="relative overflow-hidden border-t border-line bg-elevated/45 py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <Eyebrow>Clarity, not clutter</Eyebrow>
          <MaskText
            as="h2"
            className="mt-5 text-[clamp(2rem,4.4vw,3.2rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-ink"
            words={[
              "Know",
              "exactly",
              { w: "where", br: true },
              "your",
              "money",
              {
                w: "stands.",
                className: "font-display font-normal italic text-brass-ink",
              },
            ]}
          />
          <Reveal delay={0.12}>
            <p className="mt-5 text-[16.5px] leading-relaxed text-ink-muted">
              A dashboard that respects your attention. Everything that matters
              on one screen, nothing that doesn&apos;t — so you can look once,
              understand, and get back to the actual work.
            </p>
          </Reveal>

          <ul className="mt-8 space-y-3.5">
            {POINTS.map((p, i) => (
              <Reveal key={p} delay={0.18 + i * 0.07}>
                <li className="flex items-start gap-3 text-[14.5px] font-medium text-ink">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brass/10 ring-1 ring-brass/15">
                    <Check className="h-3 w-3 text-brass-ink" />
                  </span>
                  {p}
                </li>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.45}>
            <Link
              href="/register"
              className="group mt-9 inline-flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <span className="border-b border-brass-ink/40 pb-0.5 transition-colors group-hover:border-brass-ink">
                See it with your own numbers
              </span>
              <ArrowRight className="h-4 w-4 text-brass-ink transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        {/* the unfolding dashboard */}
        {/* `relative` matters: useScroll needs a positioned target to measure. */}
        <div ref={ref} className="relative" style={{ perspective: 1500 }}>
          <motion.div
            style={
              reduce
                ? undefined
                : { rotateX, y: yLift, scale, transformOrigin: "50% 100%" }
            }
            className="rounded-[22px] bg-card p-5 shadow-[0_40px_90px_-45px_rgba(28,25,23,0.55)] ring-1 ring-line sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                  Overview
                </p>
                <p className="mt-0.5 text-[15px] font-bold text-ink">Jan — Dec 2026</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink ring-1 ring-line">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                Live
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {[
                { l: "Revenue", v: 42600, up: true, d: "+18%" },
                { l: "Paid", v: 31200, up: true, d: "+12%" },
                { l: "Overdue", v: 2100, up: false, d: "−4%" },
              ].map((s, i) => (
                <motion.div
                  key={s.l}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.08, ease: EASE_OUT }}
                  className="rounded-xl bg-surface p-3.5"
                >
                  <p className="text-[11px] font-medium text-ink-muted">{s.l}</p>
                  <p className="mt-1 text-[19px] font-extrabold tracking-tight tabular-nums text-ink">
                    <CountUp to={s.v} prefix="£" duration={1.6} />
                  </p>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
                      s.up ? "text-positive" : "text-negative"
                    }`}
                  >
                    {s.up ? "▲" : "▼"} {s.d}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">Revenue trend</p>
                <span className="flex items-center gap-3 text-[11px] text-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-brass" />
                    Revenue
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-ink-muted/45" />
                    Expenses
                  </span>
                </span>
              </div>

              <RevenueChart />

              <div className="mt-3 flex justify-between text-[10px] text-ink-muted">
                {["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
