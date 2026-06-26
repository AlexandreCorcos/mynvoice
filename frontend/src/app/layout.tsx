import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.mynvoice.com"),
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
    url: "https://app.mynvoice.com",
    siteName: "MYNVOICE",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "MYNVOICE" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MYNVOICE — Your business. Your invoices.",
    description:
      "Create beautiful invoices, track expenses, and get paid faster. Free & open-source.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
