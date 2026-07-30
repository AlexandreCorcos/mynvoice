"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PasswordSetForm } from "@/components/auth/password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <PasswordSetForm
        endpoint="/auth/reset-password"
        title="Choose a new password"
        subtitle="You'll be signed in as soon as it's saved."
        submitLabel="Save and sign in"
        expiredMessage="That link has expired or already been used. Request a new one."
        fallbackHref="/forgot-password"
      />
      <Link
        href="/login"
        className="mt-7 flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </Suspense>
  );
}
