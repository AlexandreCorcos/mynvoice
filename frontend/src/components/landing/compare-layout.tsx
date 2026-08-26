"use client";

/* =========================================================================
   The marketing chrome for standalone pages like /compare.

   Mirrors what `app/page.tsx` does for the landing page — nav, footer, the
   reduced-motion config and the dark-class guard — so a marketing page that
   isn't the home page still looks and behaves like one. The page itself stays
   a server component so it can export metadata; only this wrapper is a client.
   ========================================================================= */

import { useEffect } from "react";
import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { LandingNav } from "./nav";
import { LandingFooter } from "./footer";
import { ScrollProgress } from "./primitives";

export function CompareLayout({ children }: { children: ReactNode }) {
  // Dark mode is an app-only preference. The inline script in the root layout
  // exempts the known public paths; this is the belt to that braces, so a
  // visitor whose system prefers dark never sees the marketing page in it.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing min-h-screen bg-surface text-ink">
        <ScrollProgress />
        <LandingNav />
        <main>{children}</main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
