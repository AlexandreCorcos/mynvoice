/**
 * The canonical public origin.
 *
 * The same Next app answers on three hostnames — `mynvoice.com`,
 * `www.mynvoice.com` and `app.mynvoice.com` — all returning 200 for the
 * marketing pages. Without a single declared origin that is three copies of
 * every page as far as a search engine is concerned, and the ranking signals
 * split between them.
 *
 * Every canonical tag, `og:url` and sitemap entry uses this value, so they
 * consolidate on one host. A 301 from the other two at the edge would be
 * stronger still, but that is a Cloudflare change rather than a code one.
 */
export const SITE_URL = "https://mynvoice.com";

/** The branded 1200x630 social card. Absolute, and never a signed URL. */
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Build an absolute canonical URL from a path ("/compare" -> full URL). */
export function canonical(path = "/"): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
