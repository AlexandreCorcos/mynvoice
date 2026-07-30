"use client";

import { Suspense } from "react";
import { PasswordSetForm } from "@/components/auth/password-form";

export default function SetPasswordPage() {
  return (
    <Suspense>
      <PasswordSetForm
        endpoint="/auth/set-password"
        title="Set your password"
        subtitle="Last step — then your account is ready."
        submitLabel="Finish setting up"
        expiredMessage="That link has expired or already been used. Sign up again to get a new one."
        fallbackHref="/register"
      />
    </Suspense>
  );
}
