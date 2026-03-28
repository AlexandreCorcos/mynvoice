"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  FileText,
  PoundSterling,
  Activity,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import StatCard from "@/components/ui/stat-card";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { AdminMetrics, DonationProgress } from "@/types";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [donations, setDonations] = useState<DonationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetEdit, setTargetEdit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && !user.is_admin) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    try {
      const [m, d] = await Promise.all([
        api.get<AdminMetrics>("/admin/metrics"),
        api.get<DonationProgress>("/admin/donations"),
      ]);
      setMetrics(m);
      setDonations(d);
      setTargetEdit(String(d.monthly_target));
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateTarget = async () => {
    setSaving(true);
    try {
      await api.put("/admin/donations/config", {
        monthly_target: parseFloat(targetEdit) || 1000,
      });
      fetchData();
    } catch {
      // handle
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          System Metrics
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total Users"
            value={String(metrics?.total_users || 0)}
            icon={Users}
            accent
          />
          <StatCard
            label="Active Users (30d)"
            value={String(metrics?.active_users || 0)}
            icon={Activity}
          />
          <StatCard
            label="New This Month"
            value={String(metrics?.new_users_this_month || 0)}
            icon={TrendingUp}
            trendUp
          />
          <StatCard
            label="Total Invoices"
            value={String(metrics?.total_invoices || 0)}
            icon={FileText}
          />
          <StatCard
            label="Revenue Processed"
            value={formatCurrency(metrics?.total_revenue_processed || 0)}
            icon={PoundSterling}
          />
          <StatCard
            label="Expenses Recorded"
            value={String(metrics?.total_expenses_recorded || 0)}
            icon={Wallet}
          />
        </div>
      </div>

      {/* Donation Config */}
      <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Donation Target
        </h2>
        {donations && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Monthly progress</span>
                <span className="font-medium">
                  {formatCurrency(donations.current_month_total)} /{" "}
                  {formatCurrency(donations.monthly_target)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-light overflow-hidden">
                <div
                  className="h-full rounded-full bg-coral transition-all"
                  style={{
                    width: `${Math.min(donations.percentage, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {donations.percentage.toFixed(1)}% of monthly target covered
              </p>
            </div>

            {/* Edit target */}
            <div className="flex items-end gap-3 border-t border-gray-100 pt-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Monthly target (£)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={targetEdit}
                  onChange={(e) => setTargetEdit(e.target.value)}
                  className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
                />
              </div>
              <button
                onClick={updateTarget}
                disabled={saving}
                className="rounded-[var(--radius-button)] bg-petrol-dark px-4 py-2 text-sm font-semibold text-white hover:bg-petrol-mid disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
