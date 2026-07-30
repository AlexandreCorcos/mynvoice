"use client";

/* =========================================================================
   The hero's product mock.

   Not a screenshot — a live little machine. Line items reorder themselves
   the way they would under your cursor, the total settles once, and the
   status pill walks Draft → Sent → Paid on a loop. It's the product's whole
   promise in one card, without a word of explanation.
   ========================================================================= */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, GripVertical, Plus, Send } from "lucide-react";
import { CountUp, EASE_OUT, useCalmMotion } from "./primitives";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; qty: string; price: string };

const ITEMS: Item[] = [
  { id: "a", name: "Brand identity system", qty: "1 ×", price: "£1,200.00" },
  { id: "b", name: "Website development", qty: "1 ×", price: "£3,400.00" },
  { id: "c", name: "Monthly retainer", qty: "1 ×", price: "£220.00" },
];

const STATUSES = [
  { key: "draft", label: "Draft saved", dot: "bg-ink-muted" },
  { key: "sent", label: "Sent to client", dot: "bg-brass" },
  { key: "paid", label: "Paid in full", dot: "bg-positive" },
] as const;

export function InvoiceCard({ className }: { className?: string }) {
  const reduce = useCalmMotion();
  const [items, setItems] = useState(ITEMS);
  const [status, setStatus] = useState(0);
  const [lifting, setLifting] = useState<string | null>(null);

  /* Walk the status pill through the invoice lifecycle. */
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setStatus((s) => (s + 1) % STATUSES.length), 3400);
    return () => clearInterval(t);
  }, [reduce]);

  /* Demonstrate drag-to-reorder by moving the last item to the top. */
  useEffect(() => {
    if (reduce) return;
    let cancel = 0;
    const t = setInterval(() => {
      setItems((prev) => {
        const next = [...prev];
        const moved = next.pop();
        if (!moved) return prev;
        setLifting(moved.id);
        cancel = window.setTimeout(() => setLifting(null), 700);
        return [moved, ...next];
      });
    }, 5200);
    return () => {
      clearInterval(t);
      window.clearTimeout(cancel);
    };
  }, [reduce]);

  const current = STATUSES[status];

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-[20px] bg-card ring-1 ring-black/5",
        "shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-line/70 bg-elevated/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[11px] font-medium text-ink-muted">New invoice</span>

        <span className="ml-auto inline-flex h-[22px] items-center overflow-hidden rounded-full bg-surface px-2.5 ring-1 ring-line">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.key}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold text-ink"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", current.dot)} />
              {current.label}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brass-ink">
              Invoice
            </p>
            <p className="mt-1 font-display text-2xl leading-none text-ink">INV-26-0042</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-ink-muted">Due</p>
            <p className="text-sm font-semibold text-ink">14 Aug 2026</p>
          </div>
        </div>

        {/* line items — these reorder themselves */}
        <div className="mt-5 space-y-2">
          {items.map((it) => (
            <motion.div
              key={it.id}
              layout
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              animate={{
                scale: lifting === it.id ? 1.025 : 1,
                boxShadow:
                  lifting === it.id
                    ? "0 18px 34px -18px rgba(28,25,23,0.45)"
                    : "0 0px 0px 0px rgba(28,25,23,0)",
              }}
              className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex h-6 w-6 flex-none items-center justify-center rounded-md transition-colors",
                  lifting === it.id ? "bg-brass/12 text-brass-ink" : "bg-surface text-ink-muted"
                )}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-[13px] font-medium text-ink">{it.name}</span>
              <span className="hidden text-[11px] text-ink-muted sm:block">{it.qty}</span>
              <span className="text-[13px] font-semibold tabular-nums text-ink">{it.price}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-dashed border-line pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted">
            <Plus className="h-3.5 w-3.5" /> Add line item
          </span>
          <div className="text-right">
            <p className="text-[11px] text-ink-muted">Total due</p>
            <p className="text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
              <CountUp to={4820} prefix="£" decimals={2} duration={2} />
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brass py-2.5 text-[13px] font-semibold text-white">
            <Send className="h-3.5 w-3.5" />
            Send invoice
          </span>
          <span className="inline-flex items-center rounded-xl border border-line px-4 py-2.5 text-[13px] font-semibold text-ink">
            Preview
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Satellites — the two chips that float beside the card               */
/* ------------------------------------------------------------------ */

export function PaidThisMonth() {
  return (
    <div className="w-[172px] rounded-2xl bg-card p-3.5 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.6)] ring-1 ring-black/5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
        Paid this month
      </p>
      <p className="mt-0.5 text-lg font-extrabold tracking-tight tabular-nums text-ink">
        <CountUp to={18640} prefix="£" duration={2.2} />
      </p>
      <div className="mt-2 flex h-11 items-end gap-1">
        {[38, 52, 44, 66, 58, 81, 72, 94].map((h, i) => (
          <motion.span
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.4 + i * 0.06, ease: EASE_OUT }}
            className={cn(
              "w-full rounded-[2px]",
              i === 7 ? "bg-brass" : "bg-brass/25"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function PaidToast() {
  const reduce = useCalmMotion();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setOn((v) => !v), 4200);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div className="h-[62px] w-[236px]">
      <AnimatePresence>
        {on ? (
          <motion.div
            initial={{ opacity: 0, x: 26, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 26, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="flex items-center gap-3 rounded-2xl bg-graphite p-3 pr-4 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brass text-[11px] font-bold text-white">
              AC
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-white">
                Invoice paid
              </span>
              <span className="block truncate text-[11px] text-white/50">
                Acme Studio · just now
              </span>
            </span>
            <span className="ml-auto flex h-6 w-6 flex-none items-center justify-center rounded-full bg-positive-on-dark/15">
              <Check className="h-3.5 w-3.5 text-positive-on-dark" />
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
