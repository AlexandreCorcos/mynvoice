"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MailCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { EASE_OUT } from "@/components/motion";
import { Button } from "@/components/app/button";
import { Field, Input } from "@/components/app/form";
import { AuthError, AuthHeading } from "@/components/auth/ui";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", {
        email,
        first_name: firstName,
        last_name: lastName,
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        // Registration never discloses whether an address is already in use —
        // an existing account is answered with the same "check your email"
        // success, so there is no 409 to special-case here.
        setError("Something went wrong. Try again in a moment.");
      } else {
        setError("Couldn't reach the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* No password here — the account is activated from the emailed link, so
     the only thing to confirm is that the address was right. */
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
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
            We sent a link to <span className="font-semibold text-ink">{email}</span>.
            Open it to set your password and you&apos;re in.
          </p>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-muted">
          Typo in the address?{" "}
          <button
            onClick={() => setSent(false)}
            className="font-semibold text-brass-ink transition-colors hover:text-ink"
          >
            Go back
          </button>
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      <AuthHeading
        title="Create your account"
        subtitle="Free, forever. No card, no trial clock."
      />

      <form onSubmit={submit} className="mt-7 space-y-4">
        <AuthError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input
              required
              autoFocus
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alexandre"
            />
          </Field>
          <Field label="Last name">
            <Input
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Corcos"
            />
          </Field>
        </div>

        <Field label="Email" hint="We'll send a link to set your password.">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating…" : "Create account"}
        </Button>

        <p className="text-center text-[11.5px] leading-relaxed text-ink-muted">
          By creating an account you agree that your data stays yours — you can
          export or delete it whenever you like.
        </p>
      </form>

      <p className="mt-7 text-center text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-brass-ink transition-colors hover:text-ink"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
