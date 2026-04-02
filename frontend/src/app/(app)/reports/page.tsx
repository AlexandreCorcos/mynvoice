"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
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
  Cell,
} from "recharts";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import StatCard from "@/components/ui/stat-card";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PeriodRevenue {
  period: string;
  invoiced: number;
  received: number;
  outstanding: number;
}

interface ClientRevenue {
  client_id: string | null;
  client_name: string | null;
  invoiced: number;
  received: number;
  outstanding: number;
}

interface ExpenseCategory {
  category: string | null;
  total: number;
  count: number;
}

interface ReportSummary {
  total_invoiced: number;
  total_received: number;
  total_outstanding: number;
  total_expenses: number;
}

interface ReportData {
  summary: ReportSummary;
  revenue_by_period: PeriodRevenue[];
  revenue_by_client: ClientRevenue[];
  expenses_by_category: ExpenseCategory[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Period = "month" | "quarter" | "year";

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
];

const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "GBP";

  const [period, setPeriod] = useState<Period>("month");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ReportData>(
        `/reports/?period=${period}&year=${year}`
      );
      setData(res);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [period, year]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-56 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
        {/* Table skeletons */}
        <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
        <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
      </div>
    );
  }

  const summary = data?.summary;
  const revenueByPeriod = data?.revenue_by_period || [];
  const revenueByClient = [...(data?.revenue_by_client || [])].sort(
    (a, b) => b.invoiced - a.invoiced
  );
  const expensesByCategory = [...(data?.expenses_by_category || [])].sort(
    (a, b) => b.total - a.total
  );

  const netProfit =
    (summary?.total_received || 0) - (summary?.total_expenses || 0);

  const currencySymbol =
    currency === "EUR" ? "\u20AC" : currency === "USD" ? "$" : "\u00A3";

  // Max for horizontal expense bars
  const maxExpense =
    expensesByCategory.length > 0
      ? Math.max(...expensesByCategory.map((e) => e.total))
      : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">
          Reports
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="inline-flex overflow-hidden rounded-[var(--radius-button)] border border-gray-200 dark:border-white/10">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  period === opt.value
                    ? "bg-petrol-dark text-white dark:bg-petrol-mid"
                    : "bg-white text-text-secondary hover:bg-gray-50 dark:bg-surface-dark dark:text-white/60 dark:hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Year selector */}
          <div className="inline-flex items-center gap-1 rounded-[var(--radius-button)] border border-gray-200 bg-white dark:border-white/10 dark:bg-surface-dark">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-2 text-text-secondary transition-colors hover:text-text-primary dark:text-white/50 dark:hover:text-white"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-sm font-semibold text-text-primary dark:text-white">
              {year}
            </span>
            <button
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= CURRENT_YEAR}
              className="p-2 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30 dark:text-white/50 dark:hover:text-white"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Total Invoiced"
            value={formatCurrency(summary?.total_invoiced || 0, currency)}
            icon={BarChart3}
            accent
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Total Received"
            value={formatCurrency(summary?.total_received || 0, currency)}
            icon={TrendingUp}
            trend="Payments collected"
            trendUp
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Total Outstanding"
            value={formatCurrency(summary?.total_outstanding || 0, currency)}
            icon={TrendingDown}
            trend={
              (summary?.total_outstanding || 0) > 0
                ? "Awaiting payment"
                : undefined
            }
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Net Profit"
            value={formatCurrency(netProfit, currency)}
            icon={DollarSign}
            trend={
              netProfit >= 0 ? "Received minus expenses" : "Expenses exceed received"
            }
            trendUp={netProfit >= 0}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Revenue by Period chart */}
      <FadeIn delay={0.15}>
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] dark:border dark:border-white/10 dark:bg-surface-dark">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-text-primary dark:text-white">
              Revenue by Period
            </h3>
            <p className="text-sm text-text-secondary dark:text-white/50">
              Invoiced vs received vs outstanding
            </p>
          </div>

          {revenueByPeriod.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={revenueByPeriod} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="period"
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
                  formatter={(value: number, name: string) => [
                    formatCurrency(value, currency),
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Bar
                  name="Invoiced"
                  dataKey="invoiced"
                  fill="#0F4C5C"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  name="Received"
                  dataKey="received"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  name="Outstanding"
                  dataKey="outstanding"
                  fill="#FF6B6B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-text-secondary dark:text-white/50">
              No revenue data for this period.
            </div>
          )}
        </div>
      </FadeIn>

      {/* Revenue by Client table */}
      <FadeIn delay={0.2}>
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] dark:border dark:border-white/10 dark:bg-surface-dark">
          <h3 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            Revenue by Client
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-white/50">
                    Client Name
                  </th>
                  <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-white/50">
                    Invoiced
                  </th>
                  <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-white/50">
                    Received
                  </th>
                  <th className="pb-3 pl-4 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-white/50">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenueByClient.map((row, index) => (
                  <tr
                    key={row.client_id || `no-client-${index}`}
                    className="border-b border-gray-50 last:border-0 dark:border-white/5"
                  >
                    <td className="py-3 pr-4 text-sm font-medium text-text-primary dark:text-white">
                      {row.client_name || "No client"}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-text-primary dark:text-white">
                      {formatCurrency(row.invoiced, currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(row.received, currency)}
                    </td>
                    <td className="py-3 pl-4 text-right text-sm font-medium text-coral">
                      {formatCurrency(row.outstanding, currency)}
                    </td>
                  </tr>
                ))}
                {revenueByClient.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-sm text-text-secondary dark:text-white/50"
                    >
                      No client revenue data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>

      {/* Expenses by Category */}
      <FadeIn delay={0.25}>
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] dark:border dark:border-white/10 dark:bg-surface-dark">
          <h3 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            Expenses by Category
          </h3>

          {expensesByCategory.length > 0 ? (
            <div className="space-y-3">
              {expensesByCategory.map((cat, index) => {
                const pct = maxExpense > 0 ? (cat.total / maxExpense) * 100 : 0;
                return (
                  <div key={cat.category || `uncat-${index}`} className="group">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary dark:text-white">
                        {cat.category || "Uncategorised"}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary dark:text-white/40">
                          {cat.count} {cat.count === 1 ? "expense" : "expenses"}
                        </span>
                        <span className="text-sm font-semibold text-text-primary dark:text-white">
                          {formatCurrency(cat.total, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-petrol-dark transition-all duration-500 dark:bg-petrol-mid"
                        style={{ width: `${pct}%`, minWidth: pct > 0 ? "4px" : "0" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-text-secondary dark:text-white/50">
              No expense data available for this period.
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
