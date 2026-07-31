import { NextResponse, type NextRequest } from "next/server";

/* =========================================================================
   Content-Security-Policy.

   Built here rather than in `next.config.ts` so it can differ between
   development and production, and per route later if it needs to.

   Honest about what it buys: `script-src` still needs `'unsafe-inline'`,
   because Next inlines its own hydration bootstrap and the flight payload.
   Removing that means nonces, and nonces mean every page renders per request
   — the landing page would stop being static. That is a real trade with a
   real cost, so it is a separate decision rather than something smuggled in
   here.

   What this policy does buy, and it is not nothing:

   * `connect-src` — an injected script cannot post a stolen token anywhere
     but our own API. With access tokens in `localStorage`, this is the
     single most valuable directive in the list.
   * `script-src` without a wildcard — no loading attacker-hosted script.
   * `frame-ancestors 'none'` — clickjacking, the modern form of the
     `X-Frame-Options` in next.config.ts.
   * `base-uri` and `form-action` — stops a `<base>` tag or a rewritten form
     quietly redirecting credentials to another origin.
   ========================================================================= */

const DEV = process.env.NODE_ENV !== "production";

/** Where the browser is allowed to talk, beyond our own origin. */
function apiOrigin(): string {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_API_URL ?? "https://api.mynvoice.com/api/v1"
    ).origin;
  } catch {
    return "https://api.mynvoice.com";
  }
}

function buildCsp(): string {
  const api = apiOrigin();

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],

    /* 'unsafe-inline' is Next's bootstrap; 'unsafe-eval' is React Refresh and
       is development only. */
    "script-src": ["'self'", "'unsafe-inline'", ...(DEV ? ["'unsafe-eval'"] : [])],

    /* Tailwind and Framer Motion both write inline styles. */
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],

    /* Company logos are user-uploaded and live on R2, but older rows may
       point elsewhere; breaking someone's logo to close a weak exfil channel
       is a bad trade while script-src still allows inline. */
    "img-src": ["'self'", "data:", "blob:", "https:"],

    "connect-src": [
      "'self'",
      api,
      ...(DEV ? ["ws:", "http://localhost:8000"] : []),
    ],

    "frame-ancestors": ["'none'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "manifest-src": ["'self'"],
  };

  const policy = Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");

  return DEV ? policy : `${policy}; upgrade-insecure-requests`;
}

const CSP = buildCsp();

export function middleware(_request: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", CSP);
  return res;
}

export const config = {
  /* Everything except Next's own static output and the icon routes — those
     are immutable assets that gain nothing from a policy header. */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)"],
};
