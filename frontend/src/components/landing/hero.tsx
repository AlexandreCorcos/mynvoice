"use client";

/* =========================================================================
   Hero.

   A graphite room lit by one brass lamp. The dark surface is `graphite`
   (large dark surfaces are never brass); brass only shows up as the aurora,
   the hairlines and the accent word. Everything foreground moves on a single
   entrance timeline so the section lands as one gesture, not eight.
   ========================================================================= */

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Github, MoveDown } from "lucide-react";
import {
  Aurora,
  Depth,
  EASE_OUT,
  Grain,
  GridLines,
  Magnetic,
  MaskText,
  Tilt,
  useCalmMotion,
} from "./primitives";
import { InvoiceCard, PaidThisMonth, PaidToast } from "./invoice-card";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useCalmMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  /* The whole hero sinks and dims slightly as the next section climbs over it. */
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-graphite pb-24 pt-32 sm:pb-32 sm:pt-36 lg:pb-40 lg:pt-44"
    >
      <Aurora />
      <GridLines size={64} colour="rgba(255,255,255,0.045)" />
      <Grain opacity={0.05} />

      {/* the brass horizon that closes the section */}
      <div className="hairline-brass absolute inset-x-0 bottom-0" />

      <motion.div
        style={reduce ? undefined : { y, opacity, scale }}
        className="relative z-10 mx-auto grid max-w-6xl items-center gap-16 px-5 xl:grid-cols-[1.02fr_0.98fr] xl:gap-10"
      >
        {/* ── copy ──────────────────────────────────────────────── */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-2 pr-3.5 text-[11px] font-medium text-white/70 backdrop-blur">
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute h-4 w-4 animate-ping rounded-full bg-brass-on-dark/25" />
                <span className="h-1.5 w-1.5 rounded-full bg-brass-on-dark" />
              </span>
              Free forever · Open source · No card required
            </span>
          </motion.div>

          <MaskText
            as="h1"
            className="mt-7 text-[clamp(2.6rem,7vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-white"
            delay={0.18}
            stagger={0.055}
            words={[
              "The",
              "calm",
              { w: "way", br: true },
              "to",
              "invoice,",
              { w: "track", br: true },
              "and",
              {
                w: "get paid.",
                className: "brass-text font-display font-normal italic tracking-[-0.01em]",
              },
            ]}
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.62, ease: EASE_OUT }}
            className="mt-7 max-w-md text-[17px] leading-relaxed text-white/55"
          >
            MYNVOICE is the free, open-source invoice and expense manager for
            freelancers and small businesses. A beautiful invoice in under a
            minute — no subscriptions, no upsells, no noise.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.72, ease: EASE_OUT }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Magnetic strength={0.22}>
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-4 text-sm font-semibold text-graphite"
              >
                {/* brass wipe on hover */}
                <span className="absolute inset-0 -z-10 translate-y-full bg-brass-on-dark transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
                Create your first invoice
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Magnetic>

            <a
              href="#work"
              className="group inline-flex items-center gap-2 rounded-full border border-white/12 px-6 py-4 text-sm font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white"
            >
              See how it works
              <MoveDown className="h-4 w-4 text-brass-on-dark transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.9 }}
            className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-[13px] text-white/40"
          >
            <a
              href="https://github.com/AlexandreCorcos/mynvoice"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-white/75"
            >
              <Github className="h-4 w-4" />
              Read the source
            </a>
            <span className="h-3 w-px bg-white/12" />
            <span>MIT licensed</span>
            <span className="h-3 w-px bg-white/12" />
            <span>Self-host it if you want</span>
          </motion.div>
        </div>

        {/* ── product ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease: EASE_OUT }}
          className="relative mx-auto w-full max-w-[440px] xl:max-w-none"
        >
          {/* slow brass ring behind the card */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[122%] w-[122%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brass-on-dark/15"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass-on-dark/60" />
            <span className="absolute bottom-[12%] right-[6%] h-1 w-1 rounded-full bg-brass-on-dark/40" />
          </motion.div>

          <Tilt max={7} glare className="[transform-style:preserve-3d]">
            <Depth z={0}>
              <InvoiceCard />
            </Depth>

            <Depth
              z={70}
              className="absolute hidden xl:-left-16 xl:-top-10 xl:block"
            >
              <motion.div
                initial={{ opacity: 0, y: 20, rotate: -5 }}
                animate={{ opacity: 1, y: 0, rotate: -5 }}
                transition={{ duration: 0.8, delay: 0.85, ease: EASE_OUT }}
              >
                <PaidThisMonth />
              </motion.div>
            </Depth>

            <Depth
              z={90}
              className="absolute hidden xl:-bottom-10 xl:-right-6 xl:block"
            >
              <motion.div
                initial={{ opacity: 0, y: 20, rotate: 4 }}
                animate={{ opacity: 1, y: 0, rotate: 4 }}
                transition={{ duration: 0.8, delay: 1, ease: EASE_OUT }}
              >
                <PaidToast />
              </motion.div>
            </Depth>
          </Tilt>
        </motion.div>
      </motion.div>

      {/* scroll cue */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="relative z-10 mx-auto mt-20 hidden w-px xl:block"
      >
        <motion.span
          className="block h-14 w-px bg-gradient-to-b from-transparent via-brass-on-dark/60 to-transparent"
          animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>
    </section>
  );
}
