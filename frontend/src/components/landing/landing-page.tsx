"use client";

/* =========================================================================
   Marketing landing page.

   Composed from `src/components/landing/*`. The section rhythm alternates
   graphite and light so the page breathes:

     hero (graphite) → ticker (graphite) → proof (light) → story (graphite)
     → features (light) → dashboard (light) → pricing (graphite)
     → faq (light) → footer (graphite)

   Brass is never a large fill anywhere on this page — it lives in the
   auroras, hairlines, accent words and solid buttons only.
   ========================================================================= */

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Ticker, Proof } from "@/components/landing/bands";
import { Story } from "@/components/landing/story";
import { Features } from "@/components/landing/features";
import { Insight } from "@/components/landing/insight";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { LandingFooter } from "@/components/landing/footer";
import { ScrollProgress } from "@/components/landing/primitives";

export function LandingPage() {
  // Dark mode is an app-only preference; the marketing page has a fixed
  // brand look, so make sure the class never leaks onto it.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    // `reducedMotion="user"` makes every motion component on the page drop
    // transform animation when the visitor asks for it — the individual
    // useReducedMotion() guards handle the ambient loops on top of that.
    <MotionConfig reducedMotion="user">
      <div className="landing min-h-screen bg-surface text-ink">
        <ScrollProgress />
        <LandingNav />

        <main>
          <Hero />
          <Ticker />
          <Proof />
          <Story />
          <Features />
          <Insight />
          <Pricing />
          <Faq />
        </main>

        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
