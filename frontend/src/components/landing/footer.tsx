"use client";

/* =========================================================================
   Footer.

   Closes on the wordmark at architectural scale — set in ghosted white so
   it reads as embossing rather than another block of colour. Brass appears
   only on the hairline and the hover states.
   ========================================================================= */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, Heart } from "lucide-react";
import { LogoLockup } from "@/components/brand/logo";
import { EASE_OUT, Grain, Magnetic, useCalmMotion } from "./primitives";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#work" },
      { label: "Features", href: "#features" },
      { label: "Dashboard", href: "#insight" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Create account", href: "/register" },
      { label: "Sign in", href: "/login" },
      { label: "Support the project", href: "/support" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: "https://github.com/AlexandreCorcos/mynvoice", external: true },
      { label: "MIT licence", href: "https://github.com/AlexandreCorcos/mynvoice/blob/main/LICENSE", external: true },
    ],
  },
];

export function LandingFooter() {
  const reduce = useCalmMotion();

  return (
    <footer className="relative isolate overflow-hidden bg-graphite pt-20">
      <Grain opacity={0.04} />
      <div className="hairline-brass absolute inset-x-0 top-0" />

      <div className="relative mx-auto max-w-6xl px-5">
        {/* one last, quiet invitation */}
        <div className="mb-16 flex flex-col items-start justify-between gap-6 border-b border-white/[0.07] pb-14 sm:flex-row sm:items-end">
          <h2 className="max-w-md text-[clamp(1.7rem,3.4vw,2.4rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
            Ready to send your{" "}
            <span className="font-display font-normal italic text-brass-on-dark">
              first invoice
            </span>
            ?
          </h2>
          <Magnetic strength={0.2}>
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-graphite"
            >
              <span className="absolute inset-0 -z-10 translate-y-full bg-brass-on-dark transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
              Start free — it takes a minute
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Magnetic>
        </div>

        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <LogoLockup variant="white" height={26} href={null} />
            <p className="mt-5 text-[14px] leading-relaxed text-white/45">
              Your business. Your invoices. The free, open-source invoice and
              expense manager for freelancers and small businesses.
            </p>
            <a
              href="https://github.com/AlexandreCorcos/mynvoice"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-[12.5px] font-semibold text-white/75 transition-colors hover:border-white/25 hover:text-white"
            >
              <Github className="h-3.5 w-3.5" />
              Star on GitHub
            </a>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {"external" in l && l.external ? (
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1.5 text-[13.5px] text-white/60 transition-colors hover:text-white"
                        >
                          {l.label}
                          <span className="h-px w-0 bg-brass-on-dark transition-all duration-300 group-hover:w-3" />
                        </a>
                      ) : (
                        <Link
                          href={l.href}
                          className="group inline-flex items-center gap-1.5 text-[13.5px] text-white/60 transition-colors hover:text-white"
                        >
                          {l.label}
                          <span className="h-px w-0 bg-brass-on-dark transition-all duration-300 group-hover:w-3" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* the embossed wordmark */}
        <div className="mt-16 overflow-hidden">
          <motion.p
            aria-hidden
            initial={reduce ? undefined : { y: "38%", opacity: 0 }}
            whileInView={reduce ? undefined : { y: "0%", opacity: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 1.2, ease: EASE_OUT }}
            className="select-none text-center text-[clamp(3.2rem,15.5vw,13rem)] font-extrabold leading-[0.82] tracking-[-0.055em] text-white/[0.055]"
          >
            {/* "MY" carries the brand brass, at the same faint opacity as the
                rest — a tint, not a highlight. */}
            <span className="text-brass-on-dark/[0.13]">MY</span>NVOICE
          </motion.p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] py-7 sm:flex-row">
          <p className="text-[12px] text-white/35">
            © 2026 MYNVOICE · Free &amp; open-source
          </p>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 text-[12px] text-white/35 transition-colors hover:text-white/70"
          >
            <Heart className="h-3.5 w-3.5 text-brass-on-dark" />
            Built with care, kept free by donations
          </Link>
        </div>
      </div>
    </footer>
  );
}
