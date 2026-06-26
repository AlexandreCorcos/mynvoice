"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { TokenResponse } from "@/types";
import { Logo } from "@/components/brand/logo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.replace("/forgot-password");
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<TokenResponse>("/auth/reset-password", { token, password });
      localStorage.setItem("access_token", res.access_token);
      localStorage.setItem("refresh_token", res.refresh_token);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 400
            ? "This link is invalid or has expired. Please request a new one."
            : "Something went wrong."
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
      <div className="mb-8 lg:hidden">
        <Logo height={34} href={null} />
      </div>

      <h2 className="text-2xl font-bold text-text-primary">Choose a new password</h2>
      <p className="mt-1.5 text-sm text-text-secondary">
        Enter your new password below to regain access to your account
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-[var(--radius-input)] bg-red-50 px-4 py-3 text-sm text-coral-dark">
            {error}{" "}
            {error.includes("expired") && (
              <Link href="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Min. 8 characters"
            className="w-full rounded-[var(--radius-input)] border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-petrol-mid focus:ring-0 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="Repeat your password"
            className="w-full rounded-[var(--radius-input)] border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-petrol-mid focus:ring-0 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-button)] bg-coral py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark disabled:opacity-50"
        >
          {loading ? "Saving..." : "Set new password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
