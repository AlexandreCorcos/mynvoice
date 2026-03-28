"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Invalid email or password"
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
      {/* Mobile logo */}
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral font-bold text-white">
          MV
        </div>
        <span className="text-xl font-bold text-text-primary">MYNVOICE</span>
      </div>

      <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
      <p className="mt-1.5 text-sm text-text-secondary">
        Sign in to your account to continue
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-[var(--radius-input)] bg-red-50 px-4 py-3 text-sm text-coral-dark">
            {error}
          </div>
        )}

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
            className="w-full rounded-[var(--radius-input)] border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-petrol-mid focus:ring-0 focus:outline-none"
            placeholder="Enter your password"
          />
        </div>

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-petrol-mid hover:text-petrol-dark transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-button)] bg-petrol-dark py-2.5 text-sm font-semibold text-white transition-colors hover:bg-petrol-mid disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
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
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-coral hover:text-coral-dark transition-colors"
        >
          Sign up free
        </Link>
      </p>
    </div>
  );
}
