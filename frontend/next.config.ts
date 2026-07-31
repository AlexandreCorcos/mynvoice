import type { NextConfig } from "next";
import pkg from "./package.json";

/* Response headers.
 *
 * Set here rather than at the Cloudflare edge so they live with the code,
 * apply identically in development, and cannot be lost by an edge-rule edit
 * nobody remembers making.
 *
 * The Content-Security-Policy is deliberately not in this list — it is built
 * in `middleware.ts`, where it can differ per route. */
const SECURITY_HEADERS = [
  /* Nothing here is ever meant to be framed. Belt and braces with the CSP's
     frame-ancestors, which is the modern equivalent but which older browsers
     ignore. */
  { key: "X-Frame-Options", value: "DENY" },

  { key: "X-Content-Type-Options", value: "nosniff" },

  /* Matters most on /reset-password, where the token is in the query string:
     this keeps the path out of the Referer sent to fonts.gstatic.com. It is
     already the browser default — stating it stops a future change of default,
     or a laxer policy set elsewhere, from silently widening that leak. */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  /* An invoicing app needs none of these. */
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()",
  },

  /* Severs the window.opener link both ways. */
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",

  /* "x-powered-by: Next.js" only narrows an attacker's CVE search for them. */
  poweredByHeader: false,

  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
