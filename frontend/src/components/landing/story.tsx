"use client";

/* =========================================================================
   How it works — a pinned, three-act scroll story.

   On large screens the visual pins and the copy walks past it, so the
   product appears to transform under the reader rather than being described
   to them. Below `lg` it degrades to a plain stack: pinned scroll fights
   native momentum on touch devices and isn't worth the trade.
   ========================================================================= */

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { Check, Mail, Paperclip, Send, Sparkles, Users } from "lucide-react";
import {
  CountUp,
  EASE_OUT,
  Eyebrow,
  Grain,
  GridLines,
  MaskText,
  useCalmMotion,
} from "./primitives";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Act visuals                                                         */
/* ------------------------------------------------------------------ */

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden rounded-[22px] bg-card p-6 ring-1 ring-white/10",
        "shadow-[0_50px_100px_-40px_rgba(0,0,0,0.85)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function ActCreate() {
  const lines = [
    { n: "Discovery workshop", p: "£640.00" },
    { n: "UI design — 12 screens", p: "£2,400.00" },
    { n: "Handover & docs", p: "£380.00" },
  ];
  return (
    <Panel>
      <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-white">
          NS
        </span>
        <span className="text-[13px] font-semibold text-ink">Northside Studio</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-muted">
          <Users className="h-3 w-3" /> Saved client
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {lines.map((l, i) => (
          <motion.div
            key={l.n}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.13, ease: EASE_OUT }}
            className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brass-soft" />
            <span className="flex-1 truncate text-[13px] text-ink">{l.n}</span>
            <span className="text-[13px] font-semibold tabular-nums text-ink">{l.p}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-[12px] text-ink-muted"
        >
          <Sparkles className="h-3.5 w-3.5 text-brass-ink" />
          Totals, VAT and discounts calculate as you type
        </motion.div>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
        <span className="text-[11px] uppercase tracking-wider text-ink-muted">Total</span>
        <span className="text-3xl font-extrabold tracking-tight tabular-nums text-ink">
          <CountUp to={3420} prefix="£" decimals={2} duration={1.5} />
        </span>
      </div>
    </Panel>
  );
}

function ActSend() {
  return (
    <Panel>
      <div className="flex items-center gap-2 border-b border-line pb-3 text-[12px] text-ink-muted">
        <Mail className="h-3.5 w-3.5 text-brass-ink" />
        New message
      </div>

      <dl className="mt-3 space-y-2 text-[12px]">
        {[
          ["To", "hello@northside.studio"],
          ["Subject", "Invoice INV-26-0042 from MYNVOICE"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-3 border-b border-line/70 pb-2">
            <dt className="w-14 flex-none text-ink-muted">{k}</dt>
            <dd className="truncate font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: EASE_OUT }}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[12px] font-medium text-ink"
      >
        <Paperclip className="h-3.5 w-3.5 text-brass-ink" />
        INV-26-0042.pdf
        <span className="text-ink-muted">· 214 KB</span>
      </motion.div>

      {/* the send arc */}
      <div className="relative mt-5 h-[104px] overflow-hidden rounded-xl bg-surface">
        <svg viewBox="0 0 300 104" className="absolute inset-0 h-full w-full">
          <motion.path
            d="M18 82 C 90 82, 150 20, 282 24"
            fill="none"
            stroke="var(--brass-soft)"
            strokeWidth="1.5"
            strokeDasharray="4 5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, delay: 0.35, ease: EASE_OUT }}
          />
        </svg>
        <motion.span
          className="absolute left-2 top-[68px] flex h-8 w-8 items-center justify-center rounded-full bg-brass text-white"
          initial={{ x: 0, y: 0, rotate: 0 }}
          animate={{ x: [0, 90, 176, 258], y: [0, -14, -46, -60], rotate: [0, -12, -22, -18] }}
          transition={{ duration: 1.3, delay: 0.35, ease: EASE_OUT }}
        >
          <Send className="h-3.5 w-3.5" />
        </motion.span>
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.4, ease: EASE_OUT }}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-ink ring-1 ring-line"
        >
          <Check className="h-3 w-3 text-positive" /> Delivered
        </motion.span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-[12px] text-ink-muted">
        <Mail className="h-3.5 w-3.5 flex-none text-brass-ink" />
        A copy lands in your own inbox automatically
      </div>
    </Panel>
  );
}

function ActPaid() {
  const steps = ["Draft", "Sent", "Paid"];
  return (
    <Panel className="relative">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          INV-26-0042
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 1.4, rotate: -18 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          transition={{ delay: 0.5, duration: 0.6, ease: EASE_OUT }}
          className="rounded-md border-2 border-positive px-2.5 py-1 font-display text-lg uppercase tracking-widest text-positive"
        >
          Paid
        </motion.span>
      </div>

      <div className="mt-6 flex items-center">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.25, duration: 0.45, ease: EASE_OUT }}
              className="relative flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brass text-white"
            >
              <Check className="h-4 w-4" />
              <span className="absolute -bottom-6 whitespace-nowrap text-[11px] font-semibold text-ink">
                {s}
              </span>
            </motion.span>
            {i < steps.length - 1 ? (
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3 + i * 0.25, duration: 0.4, ease: "easeOut" }}
                className="mx-2 h-0.5 flex-1 origin-left rounded bg-brass/35"
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-xl bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider text-ink-muted">
            Revenue · this year
          </span>
          <span className="text-[11px] font-semibold text-positive">▲ 24%</span>
        </div>
        <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-ink">
          <CountUp to={126480} prefix="£" duration={1.8} />
        </p>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {[34, 48, 41, 63, 55, 72, 68, 86, 79, 94, 88, 100].map((h, i) => (
            <motion.span
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.045, ease: EASE_OUT }}
              className={cn("w-full rounded-[2px]", i > 9 ? "bg-brass" : "bg-brass/25")}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Acts                                                                */
/* ------------------------------------------------------------------ */

const ACTS = [
  {
    n: "01",
    title: "Create",
    lead: "Pick a client, drop in your lines.",
    body: "Line items drag into order, subtotals and VAT recalculate as you type, and drafts save themselves. Duplicate last month's invoice and you're done in ten seconds.",
    visual: <ActCreate />,
  },
  {
    n: "02",
    title: "Send",
    lead: "One click. PDF attached.",
    body: "A clean, branded email goes out with the PDF on it — and a copy lands in your own inbox, so you always have the paper trail without cc-ing yourself.",
    visual: <ActSend />,
  },
  {
    n: "03",
    title: "Get paid",
    lead: "Watch it turn green.",
    body: "Track every invoice from draft to paid, see what's overdue before your client does, and watch the revenue line climb on your dashboard.",
    visual: <ActPaid />,
  },
];

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function Story() {
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useCalmMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v < 0.34 ? 0 : v < 0.68 ? 1 : 2;
    setActive((prev) => (prev === next ? prev : next));
  });

  return (
    // No `overflow-hidden` on this section — it would kill the sticky pin.
    // The decorative layers clip themselves instead.
    <section id="work" className="relative isolate bg-graphite">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <GridLines
          size={72}
          colour="rgba(255,255,255,0.04)"
          mask="radial-gradient(ellipse 70% 50% at 50% 50%, black 20%, transparent 75%)"
        />
        <Grain opacity={0.045} />
        <div
          className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle, rgba(199,154,91,0.20), transparent 70%)" }}
        />
      </div>

      {/* heading */}
      <div className="relative mx-auto max-w-6xl px-5 pt-24 lg:pt-32">
        <Eyebrow tone="dark">How it works</Eyebrow>
        <MaskText
          as="h2"
          className="mt-5 max-w-2xl text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white"
          words={[
            "From",
            "blank",
            { w: "page", br: true },
            "to",
            {
              w: "paid",
              className: "font-display font-normal italic text-brass-on-dark",
            },
            "in",
            "three",
            "steps.",
          ]}
        />
      </div>

      {/* ── desktop: pinned ─────────────────────────────────────── */}
      <div ref={wrap} className="relative hidden h-[300vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_0.92fr] items-center gap-16 px-5">
            {/* copy column */}
            <div className="relative pl-10">
              {/* progress rail */}
              <div className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px bg-white/10">
                <motion.span
                  className="absolute inset-x-0 top-0 origin-top bg-brass-on-dark"
                  style={{ height: "100%", scaleY: reduce ? 1 : scrollYProgress }}
                />
              </div>

              <div className="space-y-12">
                {ACTS.map((a, i) => (
                  <motion.div
                    key={a.n}
                    animate={{
                      opacity: active === i ? 1 : 0.28,
                      x: active === i ? 0 : -4,
                      filter: active === i ? "blur(0px)" : "blur(1.5px)",
                    }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display text-2xl leading-none text-brass-on-dark">
                        {a.n}
                      </span>
                      <span className="h-px w-6 bg-brass-on-dark/40" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                        {a.title}
                      </span>
                    </div>
                    <h3 className="mt-3 text-3xl font-extrabold tracking-[-0.02em] text-white">
                      {a.lead}
                    </h3>
                    <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/50">
                      {a.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* visual column */}
            <div className="relative h-[460px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 32, scale: 0.96, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -28, scale: 0.97, filter: "blur(10px)" }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                  className="absolute inset-0"
                >
                  {ACTS[active].visual}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── mobile / tablet: stacked ────────────────────────────── */}
      <div className="mx-auto max-w-6xl space-y-14 px-5 py-16 lg:hidden">
        {ACTS.map((a) => (
          <motion.div
            key={a.n}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl leading-none text-brass-on-dark">{a.n}</span>
              <span className="h-px w-6 bg-brass-on-dark/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                {a.title}
              </span>
            </div>
            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.02em] text-white">
              {a.lead}
            </h3>
            <p className="mt-2.5 text-[15px] leading-relaxed text-white/50">{a.body}</p>
            <div className="mt-6 h-[430px]">{a.visual}</div>
          </motion.div>
        ))}
      </div>

      <div className="hairline-brass absolute inset-x-0 bottom-0" />
    </section>
  );
}
