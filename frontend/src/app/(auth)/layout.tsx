"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

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
      <div className="hidden lg:flex lg:w-1/2 bg-petrol-dark items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral text-2xl font-bold text-white">
            MV
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">MYNVOICE</h1>
          <p className="text-lg text-white/70">
            Your business. Your invoices.
          </p>
          <p className="mt-6 text-sm text-white/50 leading-relaxed">
            Free, open-source invoice and expense management for small
            businesses, freelancers, and self-employed professionals.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
