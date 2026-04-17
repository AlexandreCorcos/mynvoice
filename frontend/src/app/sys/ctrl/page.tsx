"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function computePassword(): number {
  const now = new Date();
  return (now.getDate() + now.getMonth() + 1) * now.getFullYear() + now.getHours();
}

interface SysMetrics {
  total_users: number;
  active_users: number;
  new_users_this_month: number;
  total_companies: number;
  total_invoices: number;
  total_invoices_paid: number;
  total_revenue_processed: number;
  total_expenses: number;
  donation_monthly_target: number;
  donation_current_month: number;
  donation_percentage: number;
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-green-800 p-4 rounded">
      <div className="text-xs text-green-600 mb-1 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold text-green-400">{value}</div>
      {sub && <div className="text-xs text-green-700 mt-1">{sub}</div>}
    </div>
  );
}

export default function SysCtrl() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<SysMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async (pwd: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sys/metrics`, {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (!res.ok) {
        setAuthed(false);
        sessionStorage.removeItem("sys_pwd");
        return;
      }
      setMetrics(await res.json());
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("sys_pwd");
    if (stored) {
      setAuthed(true);
      fetchMetrics(Number(stored));
    }
  }, [fetchMetrics]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (username !== "admin") {
      setError("Invalid credentials");
      return;
    }
    const expected = computePassword();
    if (Number(password) !== expected) {
      setError("Invalid credentials");
      return;
    }
    sessionStorage.setItem("sys_pwd", String(expected));
    setAuthed(true);
    fetchMetrics(expected);
  };

  const handleRefresh = () => {
    const stored = sessionStorage.getItem("sys_pwd");
    if (stored) fetchMetrics(Number(stored));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("sys_pwd");
    setAuthed(false);
    setMetrics(null);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <div className="w-80">
          <div className="text-green-500 text-sm mb-6 text-center tracking-widest">
            MYNVOICE // SYS ACCESS
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              className="w-full bg-black border border-green-800 text-green-400 px-3 py-2 text-sm rounded focus:outline-none focus:border-green-500 placeholder-green-900"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-green-800 text-green-400 px-3 py-2 text-sm rounded focus:outline-none focus:border-green-500 placeholder-green-900"
            />
            {error && <div className="text-red-600 text-xs">{error}</div>}
            <button
              type="submit"
              className="w-full border border-green-700 text-green-500 py-2 text-sm rounded hover:bg-green-950 transition-colors"
            >
              ACCESS
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-mono text-green-400 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-green-900 pb-4">
          <div>
            <div className="text-green-500 text-lg tracking-widest">MYNVOICE // SYS CTRL</div>
            {lastRefresh && (
              <div className="text-green-800 text-xs mt-1">
                last refresh: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="border border-green-800 text-green-600 px-3 py-1 text-xs rounded hover:bg-green-950 transition-colors disabled:opacity-40"
            >
              {loading ? "..." : "REFRESH"}
            </button>
            <button
              onClick={handleLogout}
              className="border border-red-900 text-red-700 px-3 py-1 text-xs rounded hover:bg-red-950 transition-colors"
            >
              EXIT
            </button>
          </div>
        </div>

        {loading && !metrics && (
          <div className="text-green-800 text-sm">loading...</div>
        )}

        {metrics && (
          <div className="space-y-6">
            {/* Users */}
            <div>
              <div className="text-green-700 text-xs mb-3 uppercase tracking-widest">// users</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Total Users" value={String(metrics.total_users)} />
                <StatBox label="Active (30d)" value={String(metrics.active_users)} />
                <StatBox label="New This Month" value={String(metrics.new_users_this_month)} />
                <StatBox label="Companies" value={String(metrics.total_companies)} />
              </div>
            </div>

            {/* Invoices & Finance */}
            <div>
              <div className="text-green-700 text-xs mb-3 uppercase tracking-widest">// invoices & finance</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Total Invoices" value={String(metrics.total_invoices)} />
                <StatBox
                  label="Paid Invoices"
                  value={String(metrics.total_invoices_paid)}
                  sub={
                    metrics.total_invoices > 0
                      ? `${((metrics.total_invoices_paid / metrics.total_invoices) * 100).toFixed(1)}% paid`
                      : undefined
                  }
                />
                <StatBox
                  label="Revenue Processed"
                  value={`£${metrics.total_revenue_processed.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <StatBox label="Total Expenses" value={String(metrics.total_expenses)} />
              </div>
            </div>

            {/* Donations */}
            <div>
              <div className="text-green-700 text-xs mb-3 uppercase tracking-widest">// donations</div>
              <div className="border border-green-800 p-4 rounded">
                <div className="flex justify-between text-xs text-green-600 mb-2">
                  <span>monthly progress</span>
                  <span>
                    £{metrics.donation_current_month.toFixed(2)} / £{metrics.donation_monthly_target.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-green-950 rounded overflow-hidden mb-2">
                  <div
                    className="h-full bg-green-600 rounded transition-all"
                    style={{ width: `${Math.min(metrics.donation_percentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-green-700">{metrics.donation_percentage.toFixed(1)}% of target</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
