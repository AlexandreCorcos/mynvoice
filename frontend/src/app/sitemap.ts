import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

/* The public, indexable surface. Everything behind a login is deliberately
   absent: it is unreachable to a crawler, and listing it would only publish
   the shape of the app. Auth screens are excluded here and disallowed in
   robots.ts — a sitemap entry and a Disallow for the same URL is a mixed
   signal, so they agree. */

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];
}
