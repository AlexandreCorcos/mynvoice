"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", { email, first_name: firstName, last_name: lastName });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 409 ? "This email is already registered." : "Something went wrong. Please try again.");
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div>
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral font-bold text-white">MV</div>
          <span className="text-xl font-bold text-text-primary">MYNVOICE</span>
        </div>
        <div className="rounded-[var(--radius-card)] bg-green-50 px-6 py-8 text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
          <p className="text-sm text-text-secondary">
            We sent a link to <strong>{email}</strong>.<br />
            Click it to set your password and activate your account.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-text-secondary">
          Wrong email?{" "}
          <button onClick={() => setDone(false)} className="font-medium text-petrol-mid hover:text-petrol-dark transition-colors">
            Go back
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral font-bold text-white">MV</div>
        <span className="text-xl font-bold text-text-primary">MYNVOICE</span>
      </div>

      <h2 className="text-2xl font-bold text-text-primary">Create account</h2>
      <p className="mt-1.5 text-sm text-text-secondary">Start managing your invoices for free</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-[var(--radius-input)] bg-red-50 px-4 py-3 text-sm text-coral-dark">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-petrol-mid focus:ring-0 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-petrol-mid focus:ring-0 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
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
          disabled={loading}
          className="w-full rounded-[var(--radius-button)] bg-coral py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark disabled:opacity-50"
        >
          {loading ? "Sending..." : "Continue"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-petrol-mid hover:text-petrol-dark transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
