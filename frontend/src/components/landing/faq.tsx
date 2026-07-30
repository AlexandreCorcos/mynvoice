"use client";

/* =========================================================================
   FAQ — the four questions people actually ask before signing up.
   ========================================================================= */

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Plus } from "lucide-react";
import { EASE_OUT, Eyebrow, MaskText, Reveal } from "./primitives";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    q: "Is it actually free, or free-for-now?",
    a: "Actually free. There is no paid tier in the code and none planned — the project is MIT licensed, so if that ever changed you could fork the last free version and carry on. Hosting is paid for by optional donations.",
  },
  {
    q: "Where does my business data live?",
    a: "On our hosted instance by default, in an encrypted PostgreSQL database, and you can export it at any time. If you'd rather it never left your own hardware, clone the repo and run it yourself — the same Docker setup we use.",
  },
  {
    q: "Can I put my own branding on invoices?",
    a: "Yes. Upload your logo, set your company details, VAT number and payment terms once, and every invoice and PDF picks them up automatically.",
  },
  {
    q: "Does it handle VAT and other taxes?",
    a: "Invoices support per-line and per-invoice tax rates plus discounts, with subtotal, tax and total calculated live as you type. Set your default rate in settings and forget about it.",
  },
  {
    q: "What if I invoice clients abroad?",
    a: "Pick GBP, EUR or USD per invoice. Your dashboard and reports keep the currency alongside every figure so nothing silently gets added together that shouldn't be.",
  },
];

function Row({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <Reveal delay={index * 0.06}>
      <div
        className={cn(
          "border-b border-line transition-colors",
          open && "border-brass-soft/40"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left"
        >
          <span
            className={cn(
              "text-[16.5px] font-semibold tracking-[-0.01em] transition-colors",
              open ? "text-ink" : "text-ink group-hover:text-brass-ink"
            )}
          >
            {q}
          </span>
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className={cn(
              "flex h-8 w-8 flex-none items-center justify-center rounded-full ring-1 transition-colors",
              open
                ? "bg-brass text-white ring-brass"
                : "bg-surface text-ink-muted ring-line group-hover:ring-brass-soft/60"
            )}
          >
            <Plus className="h-4 w-4" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <p className="max-w-2xl pb-6 pr-12 text-[14.5px] leading-relaxed text-ink-muted">
                {a}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

export function Faq() {
  return (
    <section className="relative bg-surface py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Eyebrow>Questions</Eyebrow>
          <MaskText
            as="h2"
            className="mt-5 text-[clamp(1.9rem,4vw,2.8rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink"
            words={[
              "The",
              "bits",
              "people",
              "ask",
              {
                w: "before",
                className: "font-display font-normal italic text-brass-ink",
              },
              "signing",
              "up.",
            ]}
          />
        </div>

        <div>
          {QUESTIONS.map((item, i) => (
            <Row key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
