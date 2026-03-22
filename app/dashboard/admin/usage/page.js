"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Activity, Loader2, RefreshCw } from "lucide-react";

function formatBytes(n) {
  const x = Number(n) || 0;
  if (x >= 1024 ** 3) return `${(x / 1024 ** 3).toFixed(2)} GB`;
  if (x >= 1024 ** 2) return `${(x / 1024 ** 2).toFixed(2)} MB`;
  if (x >= 1024) return `${(x / 1024).toFixed(1)} KB`;
  return `${Math.round(x)} B`;
}

function UsageBar({ used, limit }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-2">
      <div
        className="h-full rounded-full bg-accent/80 transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AdminUsagePage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      if (!token) {
        setError("Session expired. Please log out and log back in.");
        setData(null);
        return;
      }
      const res = await fetch("/api/user/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setError("Session expired. Please log out and log back in.");
        setData(null);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message || "Failed to load usage");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Usage</h1>
            <p className="text-white/50 text-sm">GET /api/user/usage — current calendar month</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchUsage()}
          disabled={loading || !user}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/10 disabled:opacity-40 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {!user && (
        <p className="text-white/60 text-sm">Sign in to view usage.</p>
      )}

      {user && loading && !data && (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      )}

      {error && (
        <p className="text-red-400/90 text-sm mb-4">{error}</p>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/50">Plan</span>
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white capitalize">{data.tier}</span>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">AI generations</span>
              <span className="text-white tabular-nums">
                {data.aiUsed} / {data.aiLimit}
              </span>
            </div>
            <UsageBar used={data.aiUsed} limit={data.aiLimit} />
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">TTS characters</span>
              <span className="text-white tabular-nums">
                {data.ttsUsed.toLocaleString()} / {data.ttsLimit.toLocaleString()}
              </span>
            </div>
            <UsageBar used={data.ttsUsed} limit={data.ttsLimit} />
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">MCP requests</span>
              <span className="text-white tabular-nums">{(data.mcpUsed ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-white/40 text-xs mt-2">Hosted POST /api/mcp calls this month (no plan cap yet).</p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Cloud backup storage</span>
              <span className="text-white tabular-nums">
                {formatBytes(data.storageUsed)} / {formatBytes(data.storageLimit)}
              </span>
            </div>
            <UsageBar used={data.storageUsed} limit={data.storageLimit} />
          </div>
        </div>
      )}
    </div>
  );
}
