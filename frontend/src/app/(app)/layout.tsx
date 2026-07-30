"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { PageTransition } from "@/components/motion";
import UpdateBanner from "@/components/ui/UpdateBanner";
import { useAppVersion } from "@/hooks/useAppVersion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { hasUpdate } = useAppVersion();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3.5">
          <span className="relative flex h-9 w-9 items-center justify-center">
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-line border-t-brass" />
            <span className="h-1.5 w-1.5 rounded-full bg-brass-ink" />
          </span>
          <p className="text-[13px] text-ink-muted">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-surface">
      {hasUpdate && <UpdateBanner />}
      <Sidebar />
      <div className="lg:ml-64">
        <Topbar />
        <main className="mx-auto w-full max-w-[1360px] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
