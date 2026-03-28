"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call password reset API
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary">Check your email</h2>
        <p className="mt-2 text-sm text-text-secondary">
          If an account exists for <strong>{email}</strong>, you&apos;ll receive
          a password reset link shortly.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-petrol-mid hover:text-petrol-dark transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <h2 className="text-2xl font-bold text-text-primary">Reset password</h2>
      <p className="mt-1.5 text-sm text-text-secondary">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-[var(--radius-input)] border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-petrol-mid focus:ring-0 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-[var(--radius-button)] bg-petrol-dark py-2.5 text-sm font-semibold text-white transition-colors hover:bg-petrol-mid"
        >
          Send reset link
        </button>
      </form>
    </div>
  );
}
