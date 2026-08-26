import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/* Crawl policy.
 *
 * The marketing pages are the whole point of being indexed; everything behind
 * a sign-in is not. Auth screens are disallowed rather than left to chance:
 * they are thin, near-duplicate, and a search result landing someone on a
 * login form is a wasted click for them and a bad signal for us.
 *
 * The same Next app answers on the apex, `www` and `app`, so a crawler can
 * reach identical HTML on three hosts. The canonical tag on every page points
 * at SITE_URL, which is what actually consolidates the ranking signals — this
 * file just keeps the private surface out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Auth and onboarding — thin, gated, and duplicated across hosts.
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/set-password",
          // The signed-in application.
          "/dashboard",
          "/invoices",
          "/clients",
          "/items",
          "/payments",
          "/expenses",
          "/transactions",
          "/closing",
          "/reports",
          "/settings",
          "/support",
          // Admin.
          "/sys/",
          "/admin",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
