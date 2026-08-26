/* =========================================================================
   The marketing home page.

   A thin server component so it can export metadata — the page itself is
   `"use client"` (it is a wall of motion), and a client component cannot
   declare a title, description or canonical. Keeping this shell on the server
   means the crawler receives them in the HTML rather than after hydration.

   The canonical matters more here than anywhere: this exact page answers on
   the apex, `www` and `app`, so without it there are three copies competing.
   ========================================================================= */

import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: canonical("/") },
};

export default function Page() {
  return <LandingPage />;
}
