"use client";

/* =========================================================================
   Onboarding checklist.

   Sits at the top of the dashboard until all three steps are done, then
   retires itself — a setup prompt that has to be dismissed manually is a
   setup prompt that gets ignored.

   Graphite, so it reads as a system message rather than another data card.
   ========================================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Rocket, X } from "lucide-react";
import { api } from "@/lib/api";
import { EASE_OUT } from "@/components/motion";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "mynvoice_onboarding_dismissed";

type Step = {
  key: "business" | "client" | "invoice";
  title: string;
  description: string;
  href: string;
  complete: boolean;
};

const STEPS: Step[] = [
  {
    key: "business",
    title: "Set up your business",
    description: "Name, address and logo — they land on every invoice",
    href: "/settings",
    complete: false,
  },
  {
    key: "client",
    title: "Add your first client",
    description: "Saved once, reused every time you bill them",
    href: "/clients",
    complete: false,
  },
  {
    key: "invoice",
    title: "Send your first invoice",
    description: "About a minute, start to sent",
    href: "/invoices/new",
    complete: false,
  },
];

/** The list endpoints have returned bare arrays and wrapped shapes; accept both. */
function hasAny(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    const v = value as { items?: unknown[]; results?: unknown[] };
    if (Array.isArray(v.items)) return v.items.length > 0;
    if (Array.isArray(v.results)) return v.results.length > 0;
  }
  return false;
}

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>(STEPS);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "true") {
      setLoading(false);
      return;
    }
    setDismissed(false);

    (async () => {
      try {
        const [company, clients, invoices] = await Promise.allSettled([
          api.get<{ name?: string } | null>("/profile/company"),
          api.get<unknown>("/clients/?limit=1"),
          api.get<unknown>("/invoices/?limit=1"),
        ]);

        const done = {
          business:
            company.status === "fulfilled" &&
            Boolean((company.value as { name?: string } | null)?.name),
          client: clients.status === "fulfilled" && hasAny(clients.value),
          invoice: invoices.status === "fulfilled" && hasAny(invoices.value),
        };

        setSteps((prev) => prev.map((s) => ({ ...s, complete: done[s.key] })));

        /* All three done: retire it rather than showing an all-green
           checklist forever. */
        if (done.business && done.client && done.invoice) {
          localStorage.setItem(DISMISSED_KEY, "true");
          setDismissed(true);
        }
      } catch {
        /* fall through and show the checklist with defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (loading || dismissed) return null;

  const doneCount = steps.filter((s) => s.complete).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="relative isolate overflow-hidden rounded-[16px] bg-graphite p-5 sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-[80px]"
          style={{
            background: "radial-gradient(circle, rgba(199,154,91,0.25), transparent 70%)",
          }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-white/[0.07] text-brass-on-dark ring-1 ring-white/10">
              <Rocket className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold tracking-[-0.01em] text-white">
                Three things and you&apos;re running
              </h2>
              <p className="mt-0.5 text-[12.5px] text-white/45">
                {doneCount} of {steps.length} done — this disappears when they all are.
              </p>
            </div>
          </div>

          <button
            onClick={dismiss}
            aria-label="Dismiss setup checklist"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.07, ease: EASE_OUT }}
            >
              {step.complete ? (
                <div className="flex h-full items-start gap-2.5 rounded-[12px] border border-white/[0.07] bg-white/[0.03] p-3.5">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-positive-on-dark/15">
                    <Check className="h-3 w-3 text-positive-on-dark" />
                  </span>
                  <span className="block text-[13px] font-semibold text-white/50 line-through decoration-white/25">
                    {step.title}
                  </span>
                </div>
              ) : (
                <Link
                  href={step.href}
                  className={cn(
                    "group flex h-full items-start gap-2.5 rounded-[12px] border border-white/10 bg-white/[0.04] p-3.5",
                    "transition-colors duration-200 hover:border-brass-on-dark/40 hover:bg-white/[0.07]"
                  )}
                >
                  <span className="mt-[3px] h-3 w-3 flex-none rounded-full border-2 border-white/25 transition-colors group-hover:border-brass-on-dark" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-white">
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-white/45">
                      {step.description}
                    </span>
                  </span>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-none text-brass-on-dark opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
