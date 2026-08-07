"use client";

/* =========================================================================
   Shared form for /set-password and /reset-password.

   The two screens differ only in endpoint, copy and where a missing token
   sends you — everything else, including the validation and the "signed
   straight in afterwards" behaviour, is identical.
   ========================================================================= */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/app/button";
import { Field } from "@/components/app/form";
import { AuthError, AuthHeading, PasswordInput } from "./ui";
import type { TokenResponse } from "@/types";

const MIN_LENGTH = 8;

export function PasswordSetForm({
  endpoint,
  title,
  subtitle,
  submitLabel,
  expiredMessage,
  fallbackHref,
}: {
  endpoint: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  expiredMessage: string;
  /** Where to send someone who arrives without a token in the URL. */
  fallbackHref: string;
}) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const token = useSearchParams().get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.replace(fallbackHref);
  }, [token, router, fallbackHref]);

  const mismatch = confirm.length > 0 && password !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_LENGTH) {
      setError(`Your password needs at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<TokenResponse>(endpoint, { token, password });
      /* The endpoint set the session cookie; there is nothing to store. */

      /* Storing the tokens isn't enough — the auth context still has
         `user: null`, so the app layout would bounce straight back to
         /login and strand you here. Load the user before navigating,
         exactly as login() does. */
      await refreshUser();
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 400 ? expiredMessage : "Something went wrong.");
      } else {
        setError("Couldn't reach the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AuthHeading title={title} subtitle={subtitle} />

      <form onSubmit={submit} className="mt-7 space-y-4">
        <AuthError message={error} />

        <Field
          label="New password"
          hint={`At least ${MIN_LENGTH} characters. Longer beats complicated.`}
        >
          <PasswordInput
            required
            autoFocus
            autoComplete="new-password"
            showStrength
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        <Field
          label="Confirm password"
          error={mismatch ? "These don't match yet." : undefined}
        >
          <PasswordInput
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={loading || password.length < MIN_LENGTH || mismatch}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Saving…" : submitLabel}
        </Button>
      </form>
    </div>
  );
}
