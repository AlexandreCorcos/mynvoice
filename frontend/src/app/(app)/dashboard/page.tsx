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
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/motion";
import type { DashboardData } from "@/types";

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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
      </div>
    );
  }

  const stats = data?.stats;
  const trends = data?.monthly_trends || [];

  const chartData = trends.map((t) => ({
    month: t.month,
    Revenue: Number(t.revenue),
    Expenses: Number(t.expenses),
  }));

  return (
    <div className="space-y-6">
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
          className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
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
            value={formatCurrency(stats?.total_revenue || 0)}
            icon={PoundSterling}
            accent
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Paid Invoices"
            value={formatCurrency(stats?.total_paid || 0)}
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
            value={formatCurrency(stats?.total_overdue || 0)}
            icon={AlertTriangle}
            trend={
              (stats?.invoices_overdue_count || 0) > 0
                ? `${stats?.invoices_overdue_count} invoices need attention`
                : undefined
            }
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Chart */}
      <FadeIn delay={0.2}>
      <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Revenue vs Expenses
            </h3>
            <p className="text-sm text-text-secondary">Monthly overview</p>
          </div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1 text-sm font-medium text-petrol-mid hover:text-petrol-dark transition-colors"
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
                tickFormatter={(v) => `£${v}`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
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
          <div className="flex h-64 items-center justify-center text-sm text-text-secondary">
            No data yet. Create your first invoice to see trends.
          </div>
        )}
      </div>
      </FadeIn>

      {/* Quick summary row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-text-secondary">Unpaid</p>
          <p className="mt-1 text-xl font-bold text-text-primary">
            {formatCurrency(stats?.total_unpaid || 0)}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {stats?.invoices_unpaid_count || 0} invoices pending
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-text-secondary">
            Total Expenses
          </p>
          <p className="mt-1 text-xl font-bold text-text-primary">
            {formatCurrency(stats?.total_expenses || 0)}
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-text-secondary">
            Total Invoices
          </p>
          <p className="mt-1 text-xl font-bold text-text-primary">
            {stats?.invoices_count || 0}
          </p>
        </div>
      </div>
    </div>
  );
}
