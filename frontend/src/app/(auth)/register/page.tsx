"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(email, password, firstName, lastName);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 409
            ? "This email is already registered."
            : "Something went wrong. Please try again."
        );
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral font-bold text-white">
          MV
        </div>
        <span className="text-xl font-bold text-text-primary">MYNVOICE</span>
      </div>

      <h2 className="text-2xl font-bold text-text-primary">Create account</h2>
      <p className="mt-1.5 text-sm text-text-secondary">
        Start managing your invoices for free
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-[var(--radius-input)] bg-red-50 px-4 py-3 text-sm text-coral-dark">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-petrol-mid focus:ring-0 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Last name
            </label>
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

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-[var(--radius-input)] border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-petrol-mid focus:ring-0 focus:outline-none"
            placeholder="Min. 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-button)] bg-coral py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-text-secondary">
              or
            </span>
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-[var(--radius-button)] border border-gray-300 bg-white py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
        >
          Continue with Google
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-petrol-mid hover:text-petrol-dark transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
