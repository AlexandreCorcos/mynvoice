/* =========================================================================
   /compare — a server component on purpose.

   The landing page is `"use client"`, which means it cannot export metadata.
   This one stays on the server so the title, description, canonical and
   JSON-LD are in the HTML a crawler receives rather than assembled after
   hydration. The animated body is the client component underneath.
   ========================================================================= */

import type { Metadata } from "next";
import { CompareLayout } from "@/components/landing/compare-layout";
import { OG_IMAGE, canonical } from "@/lib/site";
import { CompareContent } from "@/components/landing/compare";

const SITE = canonical("/");
const URL = canonical("/compare");

const TITLE = "Invoicing software: where MYNVOICE fits";
const DESCRIPTION =
  "Choosing invoicing software? MYNVOICE is free forever and open source — unlimited invoices and clients, your branding, and 0% taken from your payments. An honest look at where it fits among the tools people consider.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "free invoicing software",
    "open source invoicing",
    "invoicing software alternatives",
    "free invoice generator",
    "self-hosted invoicing",
    "unlimited invoices free",
    "invoicing for freelancers",
    "small business invoicing UK",
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: "MYNVOICE",
    // Repeated rather than inherited: a page-level `openGraph` replaces the
    // layout's wholesale, so anything omitted here simply disappears.
    locale: "en_GB",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "MYNVOICE" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

/* The questions this page should be allowed to answer in a search result.
   Every answer is factual and checkable in the public source — nothing here
   asserts anything about another product. */
const FAQ = [
  {
    q: "Is MYNVOICE really free?",
    a: "Yes. There is no paid tier, no trial clock and no billing code in the repository. Every account gets unlimited invoices, unlimited clients and every feature. Hosting is paid for by voluntary donations.",
  },
  {
    q: "What is the catch with free invoicing software?",
    a: "With most tools the free tier stops somewhere — a number of invoices, a number of clients, the provider's branding on your invoice, or a percentage of each payment. Whichever tool you are looking at, check where its free tier stops and what happens then. MYNVOICE has no such limit, and because it is MIT licensed you could fork the last free version if that ever changed.",
  },
  {
    q: "Does MYNVOICE take a percentage of my invoices?",
    a: "No. MYNVOICE never processes payments, so it never takes a cut. Your client pays you directly using the bank details on your invoice.",
  },
  {
    q: "Can I use my own branding on invoices?",
    a: "Yes. Your logo, company details, VAT number, bank details and payment terms are set once and appear on every invoice and PDF. MYNVOICE never puts its own name on the document your client receives.",
  },
  {
    q: "Can I self-host MYNVOICE?",
    a: "Yes. It is MIT licensed and runs on the same Docker Compose stack we use in production, so you can keep every byte of your business data on your own hardware.",
  },
  {
    q: "What does MYNVOICE not do yet?",
    a: "There is no Pay-now button on the invoice, no recurring invoices, no quotes or estimates, no automated payment reminders, no client portal, no mobile app and no VAT filing to HMRC. It supports GBP, EUR and USD, in English.",
  },
  {
    q: "Is my invoicing data secure?",
    a: "Sessions are HttpOnly cookies rather than tokens in local storage, every state-changing request is CSRF protected, and accounts are isolated from one another. Security audits are run against production and the findings are published in the public repository.",
  },
];

export default function ComparePage() {
  // No SoftwareApplication here: the root layout already emits one site-wide,
  // and describing the same product twice on one page is noise for a crawler.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Compare", item: URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <CompareLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareContent />

      {/* The FAQ is rendered as real text, not only as JSON-LD: structured
          data that has no visible counterpart is a rich-result violation. */}
      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-5 pb-20">
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
            Questions people ask
          </h2>
          <dl className="mt-7 space-y-6">
            {FAQ.map((f) => (
              <div key={f.q} className="border-b border-line pb-6 last:border-0">
                <dt className="text-[16px] font-bold tracking-[-0.015em] text-ink">
                  {f.q}
                </dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </CompareLayout>
  );
}
