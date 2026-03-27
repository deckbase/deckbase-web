"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Key, Loader2, Check, Copy, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { isPro } = useRevenueCat();
  const [apiKeys, setApiKeys] = useState([]);
  const [newKey, setNewKey] = useState(null);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");

  const fetchApiKeys = useCallback(async () => {
    if (!user || !isPro) return;
    try {
      const token = await user.getIdToken();
      if (!token) {
        setApiKeyError("Session expired. Please log out and log back in.");
        return;
      }
      const res = await fetch("/api/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setApiKeyError("Session expired. Please log out and log back in.");
        setApiKeys([]);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setApiKeys(data.keys || []);
      setApiKeyError("");
    } catch (e) {
      setApiKeyError(e.message || "Failed to load API keys");
      setApiKeys([]);
    }
  }, [user, isPro]);

  useEffect(() => {
    if (user && isPro) fetchApiKeys();
    else setApiKeys([]);
  }, [user, isPro, fetchApiKeys]);

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!user || creating || !isPro) return;
    setCreating(true);
    setApiKeyError("");
    try {
      const token = await user.getIdToken();
      if (!token) {
        setApiKeyError("Session expired. Please log out and log back in.");
        return;
      }
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: keyName.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        setApiKeyError("Session expired. Please log out and log back in.");
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(JSON.parse(t)?.error || t);
      }
      const data = await res.json();
      setNewKey({
        key: data.key,
        id: data.id,
        name: data.name ?? data.label,
      });
      setKeyName("");
      fetchApiKeys();
    } catch (e) {
      setApiKeyError(e.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = async (keyToCopy) => {
    try {
      await navigator.clipboard.writeText(keyToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setApiKeyError("Could not copy to clipboard");
    }
  };

  const handleRevoke = async (keyId) => {
    if (!user || revokingId || !isPro) return;
    setRevokingId(keyId);
    setApiKeyError("");
    try {
      const token = await user.getIdToken();
      if (!token) {
        setApiKeyError("Session expired. Please log out and log back in.");
        return;
      }
      const res = await fetch(`/api/api-keys/${encodeURIComponent(keyId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setApiKeyError("Session expired. Please log out and log back in.");
        return;
      }
      if (!res.ok) throw new Error("Failed to revoke");
      setNewKey((prev) => (prev?.id === keyId ? null : prev));
      fetchApiKeys();
    } catch (e) {
      setApiKeyError(e.message || "Failed to revoke key");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-white/35 hover:text-white/70 text-sm mb-8 transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        Dashboard
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <Key className="w-3.5 h-3.5 text-accent" />
          </div>
          <h1 className="text-sm font-semibold text-white/90">API keys</h1>
        </div>

        {!isPro && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
            <p className="text-amber-200/90 font-medium text-sm mb-1.5">Pro or VIP required</p>
            <p className="text-white/45 text-sm">
              Upgrade to create and manage API keys for MCP tools like Cursor.
            </p>
            <Link
              href="/dashboard/subscription"
              className="inline-flex items-center justify-center rounded-xl bg-accent hover:bg-accent-hover px-4 py-2 text-sm font-medium text-white transition-all mt-4"
            >
              View plans
            </Link>
          </div>
        )}

        {isPro && (
          <div className="space-y-5">
            {apiKeyError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-red-300 text-sm">
                {apiKeyError}
              </div>
            )}

            <form onSubmit={handleCreateApiKey} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label htmlFor="api-key-name" className="block text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1.5">
                  Key name <span className="text-white/25 normal-case">(optional)</span>
                </label>
                <input
                  id="api-key-name"
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Cursor, Claude Code, CI"
                  autoComplete="off"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                  maxLength={100}
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium text-sm px-4 py-2.5 transition-all disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                {creating ? "Creating..." : "Create key"}
              </button>
            </form>

            {newKey && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                <p className="text-amber-200 text-sm font-medium mb-2">
                  Copy your key now - it won&apos;t be shown again.
                </p>
                {newKey.name && (
                  <p className="text-white/45 text-xs mb-2">
                    <span className="text-white/30">Name:</span> {newKey.name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <code className="flex-1 min-w-0 font-mono text-xs text-white/75 bg-black/30 border border-white/[0.08] px-3 py-2 rounded-lg break-all">
                    {newKey.key}
                  </code>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(newKey.key)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.07] hover:bg-white/[0.12] px-3 py-1.5 text-sm text-white transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewKey(null)}
                      className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {apiKeys.length > 0 && (
              <div className="space-y-2">
                {apiKeys.map((k) => (
                  <div
                    key={k.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 hover:border-white/[0.1] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/[0.08]">
                        <Key className="w-3 h-3 text-accent/60" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{k.name ?? k.label ?? "Unnamed key"}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">
                          Created {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "-"}
                          {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 border border-transparent hover:border-red-500/20 hover:bg-red-500/[0.05] rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-40"
                    >
                      {revokingId === k.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-white/30 text-sm">
              Use these keys with the{" "}
              <Link href="/mcp" className="text-accent hover:text-accent/80 underline underline-offset-2 transition-colors">
                MCP setup guide
              </Link>
              {" "}to connect Cursor or other tools to Deckbase.
            </p>
          </div>
        )}
      </motion.section>
    </div>
  );
}
