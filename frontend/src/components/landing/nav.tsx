"use client";

/* =========================================================================
   Floating navigation.

   Sits transparent over the graphite hero, then condenses into a frosted
   pill once the hero is behind you. The pill is graphite in both states,
   so the white wordmark works throughout and nothing has to cross-fade.
   ========================================================================= */

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Magnetic, EASE_OUT } from "./primitives";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#work", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#insight", label: "Dashboard" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav() {
  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setCondensed(v > 80));

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5"
      >
        <motion.nav
          initial={{
            maxWidth: 1180,
            backgroundColor: "rgba(23,21,19,0)",
            borderColor: "rgba(255,255,255,0)",
            paddingTop: 12,
            paddingBottom: 12,
          }}
          animate={{
            maxWidth: condensed ? 900 : 1180,
            backgroundColor: condensed ? "rgba(23,21,19,0.82)" : "rgba(23,21,19,0)",
            borderColor: condensed ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0)",
            paddingTop: condensed ? 9 : 12,
            paddingBottom: condensed ? 9 : 12,
          }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className={cn(
            "flex w-full items-center justify-between gap-6 rounded-full border px-4 backdrop-blur-xl sm:px-5",
            condensed && "shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)]"
          )}
        >
          <Link href="/" aria-label="MYNVOICE home" className="flex items-center">
            <Logo variant="white" height={26} href={null} priority />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative rounded-full px-3.5 py-2 text-[13px] font-medium text-white/65 transition-colors hover:text-white"
              >
                {l.label}
                <span className="pointer-events-none absolute inset-x-3.5 -bottom-px h-px origin-left scale-x-0 bg-brass-on-dark/70 transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-[13px] font-semibold text-white/75 transition-colors hover:bg-white/8 hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Magnetic strength={0.2}>
              <Link
                href="/register"
                className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-graphite transition-colors hover:bg-brass-on-dark"
              >
                Start free
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Magnetic>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/80 transition-colors hover:bg-white/8 md:hidden"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          </div>
        </motion.nav>
      </motion.header>

      {/* ── Mobile sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] bg-graphite/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex items-center justify-between px-6 pt-6">
              <Logo variant="white" height={26} href={null} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/80"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <motion.ul
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}
              className="mt-14 flex flex-col gap-2 px-6"
            >
              {[...LINKS, { href: "/login", label: "Sign in" }, { href: "/register", label: "Start free" }].map(
                (l) => (
                  <motion.li
                    key={l.href}
                    variants={{
                      hidden: { opacity: 0, y: 22 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
                    }}
                  >
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline justify-between border-b border-white/8 py-4 font-display text-3xl text-white"
                    >
                      {l.label}
                      <ArrowRight className="h-4 w-4 text-brass-on-dark" />
                    </a>
                  </motion.li>
                )
              )}
            </motion.ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
