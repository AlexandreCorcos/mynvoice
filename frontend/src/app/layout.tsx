import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import { SITE_URL, OG_IMAGE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // The canonical marketing origin, not the app host: the same pages answer on
  // the apex, `www` and `app`, and every absolute URL derived from here has to
  // point at the one we want indexed.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MYNVOICE — Your business. Your invoices.",
    template: "%s · MYNVOICE",
  },
  description:
    "The free, open-source way to create beautiful invoices, track expenses, and get paid faster. Built for freelancers and small businesses.",
  keywords: [
    "invoice",
    "invoicing",
    "open source",
    "free invoice software",
    "expense tracking",
    "freelancer",
    "small business",
  ],
  openGraph: {
    type: "website",
    title: "MYNVOICE — Your business. Your invoices.",
    description:
      "Create beautiful invoices, track expenses, and get paid faster. Free & open-source.",
    url: SITE_URL,
    siteName: "MYNVOICE",
    locale: "en_GB",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "MYNVOICE" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MYNVOICE — Your business. Your invoices.",
    description:
      "Create beautiful invoices, track expenses, and get paid faster. Free & open-source.",
    images: [OG_IMAGE],
  },
};

/* Site-wide structured data. Organization and WebSite describe the publisher
   and the site itself; SoftwareApplication describes the product, with a real
   £0 offer because the price genuinely is zero and is checkable in the source.
   Deliberately no aggregateRating or review: self-published star markup on your
   own product is ineligible for rich results and invites a manual action. */
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MYNVOICE",
    url: SITE_URL,
    logo: `${SITE_URL}/logo-mynvoice.png`,
    sameAs: ["https://github.com/AlexandreCorcos/mynvoice"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MYNVOICE",
    url: SITE_URL,
    inLanguage: "en-GB",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MYNVOICE",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Invoicing and expense management",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Free, open-source invoicing and expense management for freelancers and small businesses. Unlimited invoices and clients, branded PDFs, and MIT licensed so you can self-host it.",
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
    },
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;var pub=['/','/compare','/login','/register','/forgot-password','/reset-password','/set-password'];if(pub.indexOf(p)===-1){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
