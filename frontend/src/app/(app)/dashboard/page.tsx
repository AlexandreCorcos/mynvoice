"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  PoundSterling,
  FileText,
  Users,
  AlertTriangle,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import StatCard from "@/components/ui/stat-card";
import { OnboardingChecklist } from "@/components/onboarding";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/motion";
import type { DashboardData } from "@/types";

const AGING_COLORS = [
  "#22C55E", // Green - Current
  "#EAB308", // Yellow - 1-15 Days
  "#F97316", // Orange - 16-30 Days
  "#EA580C", // Red-Orange - 31-45 Days
  "#EF4444", // Red - 45+ Days
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get<DashboardData>("/dashboard/");
      setData(res);
    } catch {
      // fallback with empty data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
        <div className="h-80 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
        <div className="h-52 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const trends = data?.monthly_trends || [];
  const aging = data?.aging || [];
  const periodSummary = data?.period_summary || [];
  const currency = data?.currency || "GBP";

  const currencySymbol =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";

  const chartData = trends.map((t) => ({
    month: t.month,
    Revenue: Number(t.revenue),
    Expenses: Number(t.expenses),
  }));

  // Receivables aging calculations
  const totalReceivables = aging.reduce((sum, bucket) => sum + bucket.amount, 0);
  const agingSegments = aging.map((bucket, index) => {
    const percentage =
      totalReceivables > 0 ? (bucket.amount / totalReceivables) * 100 : 0;
    return {
      ...bucket,
      percentage,
      color: AGING_COLORS[index] || AGING_COLORS[AGING_COLORS.length - 1],
    };
  });

  return (
    <div className="space-y-6">
      {/* Onboarding */}
      <OnboardingChecklist />

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Link>
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-surface-dark dark:text-white dark:hover:bg-white/5"
        >
          <Users className="h-4 w-4" />
          Add Client
        </Link>
      </div>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats?.total_revenue || 0, currency)}
            icon={PoundSterling}
            accent
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Paid Invoices"
            value={formatCurrency(stats?.total_paid || 0, currency)}
            icon={FileText}
            trend={`${stats?.invoices_paid_count || 0} invoices`}
            trendUp
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Clients"
            value={String(stats?.clients_count || 0)}
            icon={Users}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Overdue"
            value={formatCurrency(stats?.total_overdue || 0, currency)}
            icon={AlertTriangle}
            trend={
              (stats?.invoices_overdue_count || 0) > 0
                ? `${stats?.invoices_overdue_count} invoices need attention`
                : undefined
            }
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Receivables Aging Bar */}
      <FadeIn delay={0.15}>
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] dark:bg-surface-dark dark:border dark:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-primary dark:text-white">
                Total Receivables
              </h3>
              <p className="mt-0.5 text-2xl font-bold text-text-primary dark:text-white">
                {formatCurrency(totalReceivables, currency)}
              </p>
            </div>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] bg-petrol-dark px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-petrol-mid"
            >
              <Plus className="h-4 w-4" />
              New
            </Link>
          </div>

          {/* Aging progress bar */}
          <div className="mb-4 flex h-4 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            {agingSegments.map((segment, index) =>
              segment.percentage > 0 ? (
                <div
                  key={index}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: segment.color,
                    minWidth: segment.percentage > 0 ? "4px" : "0",
                  }}
                  title={`${segment.label}: ${formatCurrency(segment.amount, currency)} (${segment.count})`}
                />
              ) : null
            )}
            {totalReceivables === 0 && (
              <div className="h-full w-full bg-gray-200 dark:bg-white/10" />
            )}
          </div>

          {/* Aging labels and amounts */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {agingSegments.map((segment, index) => (
              <div key={index} className="flex items-start gap-2">
                <div
                  className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-secondary dark:text-white/50 truncate">
                    {segment.label}
                  </p>
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {formatCurrency(segment.amount, currency)}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-white/40">
                    {segment.count} {segment.count === 1 ? "invoice" : "invoices"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Revenue vs Expenses Chart */}
      <FadeIn delay={0.2}>
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] dark:bg-surface-dark dark:border dark:border-white/10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-primary dark:text-white">
                Revenue vs Expenses
              </h3>
              <p className="text-sm text-text-secondary dark:text-white/50">
                Monthly overview
              </p>
            </div>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1 text-sm font-medium text-petrol-mid hover:text-petrol-dark transition-colors dark:text-petrol-light dark:hover:text-white"
            >
              View invoices
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#5C677D" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#5C677D" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${currencySymbol}${v}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, currency)}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="Revenue"
                  fill="#0F4C5C"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="Expenses"
                  fill="#FF6B6B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-text-secondary dark:text-white/50">
              No data yet. Create your first invoice to see trends.
            </div>
          )}
        </div>
      </FadeIn>

      {/* Sales, Receipts & Dues Table */}
      <FadeIn delay={0.25}>
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] dark:bg-surface-dark dark:border dark:border-white/10">
          <h3 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            Sales, Receipts &amp; Dues
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-white/50">
                    Period
                  </th>
                  <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-white/50">
                    Sales
                  </th>
                  <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-white/50">
                    Receipts
                  </th>
                  <th className="pb-3 pl-4 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-white/50">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {periodSummary.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-50 last:border-0 dark:border-white/5"
                  >
                    <td className="py-3 pr-4 text-sm font-medium text-text-primary dark:text-white">
                      {row.label}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-text-primary dark:text-white">
                      {formatCurrency(row.sales, currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(row.receipts, currency)}
                    </td>
                    <td className="py-3 pl-4 text-right text-sm text-coral font-medium">
                      {formatCurrency(row.due, currency)}
                    </td>
                  </tr>
                ))}
                {periodSummary.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-sm text-text-secondary dark:text-white/50"
                    >
                      No period data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>

      {/* Quick summary row */}
      <StaggerContainer
        className="grid grid-cols-1 gap-5 sm:grid-cols-3"
        delay={0.3}
      >
        <StaggerItem>
          <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] dark:bg-surface-dark dark:border dark:border-white/10">
            <p className="text-sm font-medium text-text-secondary dark:text-white/50">
              Unpaid
            </p>
            <p className="mt-1 text-xl font-bold text-text-primary dark:text-white">
              {formatCurrency(stats?.total_unpaid || 0, currency)}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary dark:text-white/40">
              {stats?.invoices_unpaid_count || 0} invoices pending
            </p>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] dark:bg-surface-dark dark:border dark:border-white/10">
            <p className="text-sm font-medium text-text-secondary dark:text-white/50">
              Total Expenses
            </p>
            <p className="mt-1 text-xl font-bold text-text-primary dark:text-white">
              {formatCurrency(stats?.total_expenses || 0, currency)}
            </p>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] dark:bg-surface-dark dark:border dark:border-white/10">
            <p className="text-sm font-medium text-text-secondary dark:text-white/50">
              Total Invoices
            </p>
            <p className="mt-1 text-xl font-bold text-text-primary dark:text-white">
              {stats?.invoices_count || 0}
            </p>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
