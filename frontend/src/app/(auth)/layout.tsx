"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Logo, LogoMark } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-light">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-petrol-dark border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="relative hidden overflow-hidden bg-petrol-dark lg:flex lg:w-1/2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 12%, rgba(255,107,107,0.22), transparent 40%), radial-gradient(circle at 15% 85%, rgba(58,156,160,0.3), transparent 45%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 30%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 30%, black, transparent 75%)",
          }}
        />
        <div className="relative flex w-full flex-col justify-between p-12 xl:p-14">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5">
            <LogoMark size={36} />
            <Logo variant="white" height={20} href={null} />
          </Link>

          <div className="max-w-md">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
              Your business.
              <br />
              Your invoices.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-white/65">
              Create beautiful invoices, track expenses, and get paid faster —
              the calm, modern way to run the money side of your business.
            </p>

            <ul className="mt-8 space-y-3.5">
              {[
                "Invoices in under a minute",
                "Send a polished PDF by email",
                "Dashboard, expenses & multi-currency",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-coral/20">
                    <Check className="h-3.5 w-3.5 text-coral-light" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/40">
            Free &amp; open-source · No credit card required
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full items-center justify-center bg-white p-8 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
