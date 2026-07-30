"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { EASE_OUT } from "@/components/motion";
import { Button } from "@/components/app/button";
import { Field, Input } from "@/components/app/form";
import { AuthError, AuthHeading } from "@/components/auth/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? "Something went wrong. Try again in a moment."
          : "Couldn't reach the server."
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <div className="rounded-[16px] bg-card p-6 text-center ring-1 ring-line">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-brass/[0.08] text-brass-ink ring-1 ring-brass/15">
            <MailCheck className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Check your email
          </h1>
          {/* Deliberately not confirming whether the address exists. */}
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
            If <span className="font-semibold text-ink">{email}</span> has an
            account, a reset link is on its way. It expires in an hour.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <AuthHeading
        title="Reset your password"
        subtitle="Tell us your email and we'll send a link to set a new one."
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

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-7 flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}
