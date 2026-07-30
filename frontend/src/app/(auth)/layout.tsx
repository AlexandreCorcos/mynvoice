"use client";

/* =========================================================================
   Auth layout.

   Split screen: the brand on graphite, the form on the page surface. The
   graphite panel is the same surface as the sidebar, so signing in already
   looks like the app you're signing into.

   Below `lg` the panel collapses to a slim graphite header — a half-height
   marketing panel above a login form is wasted scroll on a phone.
   ========================================================================= */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT, useCalmMotion } from "@/components/motion";
import { Logo, LogoMark } from "@/components/brand/logo";

const PROMISES = [
  "An invoice in under a minute",
  "A polished PDF, sent by email",
  "Dashboard, expenses and multi-currency",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const reduce = useCalmMotion();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  /* Auth screens are public and always render in the light brand theme. */
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <span className="relative flex h-9 w-9 items-center justify-center">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-line border-t-brass" />
          <span className="h-1.5 w-1.5 rounded-full bg-brass-ink" />
        </span>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* ── brand panel ──────────────────────────────────────────── */}
      <div className="relative isolate flex overflow-hidden bg-graphite lg:min-h-dvh lg:w-[46%]">
        {/* one slow brass glow, contained */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-32 h-[34rem] w-[34rem] rounded-full blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(199,154,91,0.26), transparent 68%)",
          }}
          animate={reduce ? undefined : { x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 80% 70% at 40% 30%, black, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 40% 30%, black, transparent 78%)",
          }}
        />

        <div className="relative flex w-full items-center justify-between gap-4 px-6 py-5 lg:flex-col lg:items-start lg:justify-between lg:px-12 lg:py-12 xl:px-14">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5">
            <LogoMark size={34} />
            <Logo variant="white" height={22} href={null} />
          </Link>

          {/* the pitch — desktop only; on a phone the form is the point */}
          <div className="hidden max-w-md lg:block">
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT }}
              className="text-[clamp(2rem,3.4vw,2.6rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-white"
            >
              Your business.
              <br />
              Your{" "}
              <span className="font-display font-normal italic text-brass-on-dark">
                invoices.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT }}
              className="mt-5 text-[16px] leading-relaxed text-white/55"
            >
              The calm, modern way to run the money side of your business —
              free, open-source, and yours.
            </motion.p>

            <ul className="mt-8 space-y-3">
              {PROMISES.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: EASE_OUT }}
                  className="flex items-center gap-3 text-[14px] text-white/75"
                >
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brass-on-dark/12 ring-1 ring-brass-on-dark/25">
                    <Check className="h-3 w-3 text-brass-on-dark" />
                  </span>
                  {p}
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="text-[12px] text-white/35 lg:text-[13px]">
            Free &amp; open-source · No card required
          </p>
        </div>
      </div>

      {/* ── form panel ───────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-surface px-5 py-10 sm:px-8 lg:py-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
