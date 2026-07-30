"use client";

/* =========================================================================
   Features — a bento grid where every tile demonstrates itself.

   Each tile owns one small, distinct piece of motion (typing, filling,
   fanning, flipping, sliding) so the grid reads as a set of live instruments
   rather than six identical boxes with icons in them.
   ========================================================================= */

import {
  AnimatePresence,
  motion,
  useInView,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Coins,
  FileDown,
  Github,
  Receipt,
  ServerCog,
  Users,
  Wallet,
} from "lucide-react";
import {
  CountUp,
  EASE_OUT,
  Eyebrow,
  MaskText,
  Reveal,
  Spotlight,
  useCalmMotion,
} from "./primitives";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tile shell                                                          */
/* ------------------------------------------------------------------ */

function Tile({
  icon: Icon,
  title,
  desc,
  children,
  className,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  children?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <Spotlight className="h-full rounded-[20px]">
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="relative flex h-full flex-col overflow-hidden rounded-[20px] bg-card p-6 ring-1 ring-line transition-shadow duration-300 hover:shadow-[0_28px_60px_-32px_rgba(28,25,23,0.45)]"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brass/[0.07] text-brass-ink ring-1 ring-brass/10">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <h3 className="mt-5 text-[17px] font-bold tracking-[-0.01em] text-ink">{title}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{desc}</p>
          {children}
        </motion.div>
      </Spotlight>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Tile A — a line item typing itself in                               */
/* ------------------------------------------------------------------ */

const TYPED = [
  { name: "Discovery workshop", price: 640 },
  { name: "UI design — 12 screens", price: 2400 },
  { name: "Copywriting pass", price: 380 },
];

const money = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function TypingInvoice() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useCalmMotion();
  /* step === n means rows [0, n) are committed and row n is being typed.
     step === TYPED.length means the invoice is complete; it then resets. */
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (reduce || !inView) return;

    if (step >= TYPED.length) {
      const hold = window.setTimeout(() => {
        setStep(0);
        setTyped("");
      }, 2600);
      return () => window.clearTimeout(hold);
    }

    const target = TYPED[step].name;
    let i = 0;
    let advance = 0;
    const tick = window.setInterval(() => {
      i += 1;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        window.clearInterval(tick);
        advance = window.setTimeout(() => setStep((s) => s + 1), 520);
      }
    }, 45);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(advance);
    };
  }, [step, inView, reduce]);

  const committed = reduce ? TYPED.length : step;
  const total = TYPED.slice(0, committed).reduce((s, l) => s + l.price, 0);

  return (
    <div ref={ref} className="mt-6 rounded-xl border border-line bg-surface p-3">
      <div className="space-y-1.5">
        {TYPED.map((l, i) => {
          const done = i < committed;
          const active = i === committed && !reduce;

          if (!done && !active) {
            return (
              <div
                key={l.name}
                className="flex h-8 items-center rounded-lg border border-dashed border-line px-2.5 text-[12px] text-ink-muted/40"
              >
                Add a line item…
              </div>
            );
          }

          return (
            <motion.div
              key={l.name}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              className="flex h-8 items-center gap-2 rounded-lg bg-card px-2.5 ring-1 ring-line"
            >
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-brass-soft" />
              <span className="flex-1 truncate text-[12px] text-ink">
                {active ? typed : l.name}
                {active ? (
                  <motion.span
                    className="ml-px inline-block h-3 w-px translate-y-[2px] bg-brass-ink align-middle"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                ) : null}
              </span>
              {done ? (
                <span className="text-[12px] font-semibold tabular-nums text-ink">
                  {money(l.price)}
                </span>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-[11px] uppercase tracking-wider text-ink-muted">Total</span>
        <motion.span
          key={total}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="text-[15px] font-extrabold tabular-nums text-ink"
        >
          {money(total)}
        </motion.span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tile B — expense categories filling a bar                            */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { n: "Software", v: 34, c: "bg-brass" },
  { n: "Travel", v: 24, c: "bg-brass/60" },
  { n: "Office", v: 22, c: "bg-brass/35" },
  { n: "Other", v: 20, c: "bg-ink-muted/25" },
];

const RECENT_EXPENSES = [
  { n: "Figma — team", v: "£45.00" },
  { n: "Train to Leeds", v: "£82.40" },
  { n: "Domain renewal", v: "£12.00" },
];

function ExpenseBar() {
  return (
    <div className="mt-auto pt-6">
      <div className="mb-5 space-y-1.5">
        {RECENT_EXPENSES.map((e, i) => (
          <motion.div
            key={e.n}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: EASE_OUT }}
            className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-2 text-[12px]"
          >
            <span className="truncate text-ink">{e.n}</span>
            <span className="font-semibold tabular-nums text-ink-muted">{e.v}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full">
        {CATEGORIES.map((c, i) => (
          <motion.span
            key={c.n}
            initial={{ width: 0 }}
            whileInView={{ width: `${c.v}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 + i * 0.1, ease: EASE_OUT }}
            className={cn("h-full rounded-full", c.c)}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {CATEGORIES.map((c) => (
          <span key={c.n} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span className={cn("h-2 w-2 rounded-[3px]", c.c)} />
            {c.n}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tile C — avatars that fan out on hover                               */
/* ------------------------------------------------------------------ */

const CLIENTS = [
  { i: "NS", c: "bg-brass" },
  { i: "AC", c: "bg-graphite" },
  { i: "LV", c: "bg-brass-strong" },
  { i: "KM", c: "bg-ink-muted" },
];

function ClientStack() {
  return (
    <div className="mt-auto flex items-center pt-6">
      <div className="group/stack flex">
        {CLIENTS.map((c, i) => (
          <motion.span
            key={c.i}
            initial={false}
            whileHover={{ y: -4 }}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-card transition-all duration-300",
              c.c,
              i > 0 && "-ml-3 group-hover/stack:ml-1"
            )}
          >
            {c.i}
          </motion.span>
        ))}
        <span className="-ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-[11px] font-bold text-ink-muted ring-2 ring-card transition-all duration-300 group-hover/stack:ml-1">
          +9
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tile D — the currency flipper                                        */
/* ------------------------------------------------------------------ */

const MONEY = [
  { s: "£", n: "12,480", c: "GBP" },
  { s: "€", n: "14,610", c: "EUR" },
  { s: "$", n: "15,940", c: "USD" },
];

function CurrencyFlip() {
  const reduce = useCalmMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % MONEY.length), 2400);
    return () => clearInterval(t);
  }, [reduce]);

  const m = MONEY[i];

  return (
    <div className="mt-auto pt-6">
      <div className="flex h-11 items-baseline gap-2 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={m.c}
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -26, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="text-[28px] font-extrabold tracking-tight tabular-nums text-ink"
          >
            {m.s}
            {m.n}
          </motion.span>
        </AnimatePresence>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-brass-ink">
          {m.c}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tile E — PDF sliding out of the stack                                */
/* ------------------------------------------------------------------ */

function PdfStack() {
  return (
    <div className="group/pdf relative mt-auto h-[92px] pt-6">
      {[2, 1, 0].map((n) => (
        <span
          key={n}
          className="absolute bottom-0 left-0 h-16 w-[104px] rounded-lg border border-line bg-card transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transform: `translate(${n * 9}px, ${-n * 5}px) rotate(${n * 2.2}deg)`,
          }}
        />
      ))}
      <span className="absolute bottom-0 left-0 flex h-16 w-[104px] flex-col justify-between rounded-lg border border-line bg-card p-2.5 shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/pdf:-translate-y-3 group-hover/pdf:translate-x-8 group-hover/pdf:rotate-[-6deg]">
        <span className="h-1 w-8 rounded bg-brass/40" />
        <span className="space-y-1">
          <span className="block h-1 w-full rounded bg-line" />
          <span className="block h-1 w-3/4 rounded bg-line" />
        </span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-brass-ink">PDF</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function Features() {
  return (
    <section id="features" className="relative bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <Eyebrow>Everything you need</Eyebrow>
          <MaskText
            as="h2"
            className="mt-5 text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink"
            words={[
              "The",
              "whole",
              "money",
              { w: "side,", br: true },
              "in",
              "one",
              { w: "calm", className: "font-display font-normal italic text-brass-ink" },
              "place.",
            ]}
          />
          <Reveal delay={0.15}>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-muted">
              No bloat, no clutter, no ten-tab settings maze. Just the tools that
              move your business forward — built to be genuinely pleasant to use.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Tile
            icon={Receipt}
            title="Invoices that build themselves"
            desc="Drag line items into order, watch subtotals, VAT and discounts recalculate as you type, and duplicate last month's invoice in a click."
            className="sm:col-span-2"
          >
            <TypingInvoice />
          </Tile>

          <Tile
            icon={Wallet}
            title="Expenses, tamed"
            desc="Fixed and variable costs, your own categories, month-by-month totals that actually add up."
            delay={0.06}
          >
            <ExpenseBar />
          </Tile>

          <Tile
            icon={Users}
            title="Clients on file"
            desc="Addresses, contacts and tax details saved once, reused on every invoice you ever send."
            delay={0.02}
          >
            <ClientStack />
          </Tile>

          <Tile
            icon={Coins}
            title="Multi-currency"
            desc="Bill in pounds, euros or dollars. Totals and reports follow along without a spreadsheet in sight."
            delay={0.08}
          >
            <CurrencyFlip />
          </Tile>

          <Tile
            icon={FileDown}
            title="A proper PDF, every time"
            desc="Branded with your logo, attached to the email, and copied to your own inbox for the paper trail."
            delay={0.14}
          >
            <PdfStack />
          </Tile>
        </div>

        {/* wide dark strip */}
        <Reveal delay={0.1} className="mt-4">
          <div className="relative isolate overflow-hidden rounded-[20px] bg-graphite p-8 sm:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[100px]"
              style={{ background: "radial-gradient(circle, rgba(199,154,91,0.28), transparent 70%)" }}
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-lg">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-brass-on-dark ring-1 ring-white/10">
                  <ServerCog className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.02em] text-white">
                  Open source. Self-host it if you like.
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/50">
                  The whole thing is MIT licensed and on GitHub. Run it on our
                  hosting for free, or put it on your own box and keep every byte
                  of your business data under your roof.
                </p>
                <a
                  href="https://github.com/AlexandreCorcos/mynvoice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/5"
                >
                  <Github className="h-4 w-4" />
                  Browse the repository
                  <ArrowUpRight className="h-3.5 w-3.5 text-brass-on-dark transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>

              <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-[12px] leading-6 text-white/60">
                <p className="text-white/30"># up and running in one command</p>
                <p>
                  <span className="text-brass-on-dark">$</span> git clone
                  github.com/…/mynvoice
                </p>
                <p>
                  <span className="text-brass-on-dark">$</span> docker compose up
                </p>
                <p className="text-positive-on-dark">
                  ✓ ready on http://localhost:3000
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
