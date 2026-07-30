"use client";

/* =========================================================================
   Support.

   The one place in the app that asks for something. It should read as an
   explanation, not a pitch — the honest version ("here's the bill, here's
   what's covered, chip in if it's worth it to you") converts better than
   the pleading one, and it's also just true.

   The graphite hero follows the containment rule: the large dark surface
   is `graphite`, and brass appears only in the glow and the buttons.
   ========================================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Coffee, CreditCard, Github, Heart, ServerCog } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { EASE_OUT } from "@/components/motion";
import { Panel, PanelHeader } from "@/components/app/panel";
import type { DonationProgress } from "@/types";

const BMAC_URL = process.env.NEXT_PUBLIC_BMAC_URL;
const STRIPE_URL = process.env.NEXT_PUBLIC_STRIPE_URL;

export default function SupportPage() {
  const [progress, setProgress] = useState<DonationProgress | null>(null);

  useEffect(() => {
    api
      .get<DonationProgress>("/admin/donations")
      .then(setProgress)
      .catch(() => {
        /* the page still makes sense without the figures */
      });
  }, []);

  const currency = progress?.currency || "GBP";
  const money = (n: number) => formatCurrency(n, currency);
  const pct = progress ? Math.min(100, Math.round(progress.percentage)) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* ── the ask ──────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="relative isolate overflow-hidden rounded-[18px] bg-graphite p-8 text-center sm:p-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-[90px]"
          style={{ background: "radial-gradient(circle, rgba(199,154,91,0.30), transparent 70%)" }}
        />

        <div className="relative">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/[0.07] text-brass-on-dark ring-1 ring-white/10">
            <Heart className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-[clamp(1.6rem,3.6vw,2.1rem)] font-extrabold leading-[1.15] tracking-[-0.025em] text-white">
            MYNVOICE is free because people chip in.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-white/55">
            No tiers, no trial clock, no feature held back. What it does cost
            is servers, a database and email delivery — and that&apos;s what
            donations pay for.
          </p>

          {progress ? (
            <div className="mx-auto mt-8 max-w-md text-left">
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-semibold text-white">
                  {money(progress.current_month_total)}
                  <span className="text-white/40">
                    {" "}
                    of {money(progress.monthly_target)} covered
                  </span>
                </span>
                <span className="font-bold tabular-nums text-brass-on-dark">{pct}%</span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, delay: 0.25, ease: EASE_OUT }}
                  className="block h-full rounded-full bg-gradient-to-r from-brass to-brass-on-dark"
                />
              </div>
              {progress.message ? (
                <p className="mt-3 text-[12.5px] text-white/45">{progress.message}</p>
              ) : null}
            </div>
          ) : null}

          {/* Both links are env-configured; with neither set this would be an
              empty gap, so the whole row goes rather than an empty one. */}
          <div
            className={
              BMAC_URL || STRIPE_URL
                ? "mt-8 flex flex-wrap justify-center gap-2.5"
                : "hidden"
            }
          >
            {BMAC_URL ? (
              <a
                href={BMAC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-semibold text-graphite transition-colors hover:bg-brass-on-dark"
              >
                <Coffee className="h-4 w-4" />
                Buy me a coffee
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            ) : null}
            {STRIPE_URL ? (
              <a
                href={STRIPE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/12 px-6 py-3 text-[13.5px] font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.06]"
              >
                <CreditCard className="h-4 w-4" />
                Donate by card
                <ArrowUpRight className="h-3.5 w-3.5 text-brass-on-dark transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            ) : null}
          </div>

          <p className="mt-5 text-[12px] text-white/35">
            And if you can&apos;t, use it anyway. That&apos;s the deal.
          </p>
        </div>
      </motion.section>

      {/* ── other ways ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Where the money goes"
            caption="No salaries, no marketing budget"
          />
          <ul className="mt-4 space-y-2.5">
            {[
              "Server and database hosting",
              "Email delivery for invoices",
              "Domain and certificates",
              "Backups and storage",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink">
                <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-brass-soft" />
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader
            title="Other ways to help"
            caption="Money isn't the only currency"
          />
          <div className="mt-4 space-y-2">
            <a
              href="https://github.com/AlexandreCorcos/mynvoice"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-[12px] p-3 ring-1 ring-line transition-colors hover:bg-elevated"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-elevated text-ink-muted">
                <Github className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">
                  Star the repository
                </span>
                <span className="block text-[11.5px] text-ink-muted">
                  It genuinely helps people find it
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 flex-none text-ink-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>

            <a
              href="https://github.com/AlexandreCorcos/mynvoice/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-[12px] p-3 ring-1 ring-line transition-colors hover:bg-elevated"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-elevated text-ink-muted">
                <ServerCog className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">
                  Report a bug, or self-host it
                </span>
                <span className="block text-[11.5px] text-ink-muted">
                  Every issue filed makes the next release better
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 flex-none text-ink-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </Panel>
      </div>

      <p className="pt-2 text-center text-[12.5px] text-ink-muted">
        Thank you for using MYNVOICE.{" "}
        <Link href="/dashboard" className="font-semibold text-brass-ink hover:underline">
          Back to your dashboard
        </Link>
      </p>
    </div>
  );
}
