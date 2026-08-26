"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/app/button";
import { Field, Input } from "@/components/app/form";
import { AuthError, AuthHeading, PasswordInput } from "@/components/auth/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError("That email and password don't match.");
        else if (err.status === 403)
          setError("Verify your email first — check your inbox for the link.");
        else setError("Something went wrong. Try again in a moment.");
      } else {
        setError("Couldn't reach the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AuthHeading
        title="Welcome back"
        subtitle="Sign in to pick up where you left off."
      />

      <form onSubmit={submit} className="mt-7 space-y-4">
        <AuthError message={error} />

        <Field label="Email">
          <Input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <div>
          <Field label="Password">
            <PasswordInput
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <div className="mt-2 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-medium text-brass-ink transition-colors hover:text-ink"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Signing in…" : "Sign in"}
        </Button>

        {/* "Continue with Google" lived here with its `or` divider. It had no
            click handler and there is no /auth/google route behind it — a
            button that silently did nothing. Hidden until Google OAuth is
            actually implemented (the schema, config and CSRF exemption are
            already in place; the route and this button are what's missing).
            The `continueWithGoogle` string is kept in en-GB.json for then. */}
      </form>

      <p className="mt-7 text-center text-[13px] text-ink-muted">
        New here?{" "}
        <Link
          href="/register"
          className="font-semibold text-brass-ink transition-colors hover:text-ink"
        >
          Create a free account
        </Link>
      </p>
    </div>
  );
}
