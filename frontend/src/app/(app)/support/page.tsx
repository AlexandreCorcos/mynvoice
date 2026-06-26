"use client";

import { useEffect, useState } from "react";
import { Heart, Coffee, CreditCard, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { DonationProgress } from "@/types";

const BMAC_URL = process.env.NEXT_PUBLIC_BMAC_URL;
const STRIPE_URL = process.env.NEXT_PUBLIC_STRIPE_URL;

export default function SupportPage() {
  const [progress, setProgress] = useState<DonationProgress | null>(null);

  useEffect(() => {
    api
      .get<DonationProgress>("/admin/donations")
      .then(setProgress)
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Hero */}
      <div className="rounded-[var(--radius-card)] bg-petrol-dark p-8 text-center text-white mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-coral">
          <Heart className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Support MYNVOICE</h2>
        <p className="text-white/70 max-w-md mx-auto">
          MYNVOICE is free and open-source. Your donations help cover hosting,
          infrastructure, and development costs.
        </p>
      </div>

      {/* Progress */}
      {progress && (
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] mb-8">
          <h3 className="text-base font-semibold text-text-primary mb-4">
            Monthly Costs Coverage
          </h3>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">
              {formatCurrency(progress.current_month_total)} raised
            </span>
            <span className="font-medium text-text-primary">
              {formatCurrency(progress.monthly_target)} goal
            </span>
          </div>
          <div className="h-4 rounded-full bg-surface-light overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-coral to-coral-light transition-all"
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </div>
          <p className="text-sm text-text-secondary mt-2">
            {progress.percentage.toFixed(0)}% of monthly costs covered
          </p>
          {progress.message && (
            <p className="mt-3 text-sm text-text-secondary italic">
              {progress.message}
            </p>
          )}
        </div>
      )}

      {/* What donations support */}
      <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] mb-8">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          What Your Support Covers
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-light p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-petrol-dark/10">
              <svg className="h-5 w-5 text-petrol-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-text-primary">Hosting</h4>
            <p className="text-xs text-text-secondary mt-1">Servers, databases, and CDN</p>
          </div>
          <div className="rounded-xl bg-surface-light p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-petrol-dark/10">
              <svg className="h-5 w-5 text-petrol-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-text-primary">Infrastructure</h4>
            <p className="text-xs text-text-secondary mt-1">Email, storage, monitoring</p>
          </div>
          <div className="rounded-xl bg-surface-light p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-petrol-dark/10">
              <svg className="h-5 w-5 text-petrol-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-text-primary">Development</h4>
            <p className="text-xs text-text-secondary mt-1">New features and maintenance</p>
          </div>
        </div>
      </div>

      {/* Donation buttons */}
      <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          Ways to Support
        </h3>
        <div className="space-y-3">
          {/* Buy Me a Coffee */}
          {BMAC_URL ? (
            <a
              href={BMAC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between gap-3 rounded-[var(--radius-button)] border-2 border-coral bg-coral/5 px-5 py-4 text-left hover:bg-coral/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Coffee className="h-5 w-5 text-coral flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Buy Me a Coffee</p>
                  <p className="text-xs text-text-secondary">Quick one-time donation</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-coral flex-shrink-0" />
            </a>
          ) : (
            <div className="w-full flex items-center gap-3 rounded-[var(--radius-button)] border-2 border-gray-200 bg-gray-50 px-5 py-4 opacity-50 cursor-not-allowed">
              <Coffee className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Buy Me a Coffee</p>
                <p className="text-xs text-text-secondary">Coming soon</p>
              </div>
            </div>
          )}

          {/* Stripe */}
          {STRIPE_URL ? (
            <a
              href={STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between gap-3 rounded-[var(--radius-button)] border border-gray-200 px-5 py-4 text-left hover:border-petrol-mid hover:bg-surface-light transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-petrol-mid flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Card / Stripe</p>
                  <p className="text-xs text-text-secondary">One-time or monthly donation</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-petrol-mid flex-shrink-0" />
            </a>
          ) : (
            <div className="w-full flex items-center gap-3 rounded-[var(--radius-button)] border border-gray-200 px-5 py-4 opacity-50 cursor-not-allowed">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Card / Stripe</p>
                <p className="text-xs text-text-secondary">Coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
