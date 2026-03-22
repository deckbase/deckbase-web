"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import Link from "next/link";
import { Key, ArrowLeft, Copy, Check, Trash2, Loader2 } from "lucide-react";

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { isPro } = useRevenueCat();
  const [apiKeys, setApiKeys] = useState([]);
  const [newKey, setNewKey] = useState(null);
  /** Display name for the key (stored as `label` in Firestore) */
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const fetchApiKeys = useCallback(async () => {
    if (!user || !isPro) return;
    try {
      const token = await user.getIdToken();
      if (!token) {
        setError("Session expired. Please log out and log back in.");
        return;
      }
      const res = await fetch("/api/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setError("Session expired. Please log out and log back in.");
        setApiKeys([]);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setApiKeys(data.keys || []);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load API keys");
      setApiKeys([]);
    }
  }, [user, isPro]);

  useEffect(() => {
    if (user && isPro) fetchApiKeys();
    else setApiKeys([]);
  }, [user, isPro, fetchApiKeys]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user || creating || !isPro) return;
    setCreating(true);
    setError("");
    try {
      const token = await user.getIdToken();
      if (!token) {
        setError("Session expired. Please log out and log back in.");
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
        setError("Session expired. Please log out and log back in.");
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
        createdAt: data.createdAt,
      });
      setKeyName("");
      fetchApiKeys();
    } catch (e) {
      setError(e.message || "Failed to create API key");
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
      setError("Could not copy to clipboard");
    }
  };

  const handleRevoke = async (keyId) => {
    if (!user || revokingId || !isPro) return;
    setRevokingId(keyId);
    setError("");
    try {
      const token = await user.getIdToken();
      if (!token) {
        setError("Session expired. Please log out and log back in.");
        return;
      }
      const res = await fetch(`/api/api-keys/${encodeURIComponent(keyId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setError("Session expired. Please log out and log back in.");
        return;
      }
      if (!res.ok) throw new Error("Failed to revoke");
      setNewKey((prev) => (prev?.id === keyId ? null : prev));
      fetchApiKeys();
    } catch (e) {
      setError(e.message || "Failed to revoke key");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>
      <div className="flex items-center gap-2 mb-8">
        <Key className="w-8 h-8 text-accent" />
        <h1 className="text-2xl font-bold text-white">API keys</h1>
      </div>

      {!isPro && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 mb-8">
          <p className="text-amber-200 font-medium mb-2">Pro or VIP required</p>
          <p className="text-white/70 text-sm mb-4">
            API keys are used to connect tools like Cursor to Deckbase (MCP). Upgrade to create and manage keys.
          </p>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium px-4 py-2 transition-colors"
          >
            View subscription
          </Link>
        </div>
      )}

      {isPro && (
        <>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm mb-6">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">Create new key</h2>
            <p className="text-white/60 text-sm">
              Use API keys to authenticate with the Deckbase MCP endpoint (e.g. in Cursor). Keys don&apos;t expire. You won&apos;t be able to see the key again after creation.
            </p>
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="api-key-name" className="block text-sm font-medium text-white/70 mb-1.5">
                  Name <span className="text-white/40 font-normal">(optional)</span>
                </label>
                <input
                  id="api-key-name"
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Cursor, Claude Code, CI"
                  autoComplete="off"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  maxLength={100}
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium px-4 py-2.5 transition-colors disabled:opacity-60"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {creating ? "Creating…" : "Create API key"}
              </button>
            </form>

            {newKey && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-amber-200 text-sm font-medium mb-1">
                  Copy this key now. We won&apos;t show it again.
                </p>
                {newKey.name && (
                  <p className="text-white/60 text-xs mb-2">
                    Name: <span className="text-white/80">{newKey.name}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-white/90 text-sm break-all flex-1 min-w-0 bg-black/20 px-2 py-1 rounded">
                    {newKey.key}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyKey(newKey.key)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKey(null)}
                    className="text-white/60 hover:text-white text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {apiKeys.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Your API keys</h2>
                <ul className="space-y-2">
                  {apiKeys.map((k) => (
                    <li
                      key={k.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-white/90">{k.name ?? k.label}</span>
                        <p className="text-white/50 text-xs mt-0.5">
                          Created {k.createdAt ? new Date(k.createdAt).toLocaleString() : "—"}
                          {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleString()}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevoke(k.id)}
                        disabled={revokingId === k.id}
                        className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                      >
                        {revokingId === k.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="mt-6 text-white/50 text-sm">
            Use these keys with the{" "}
            <Link href="/mcp" className="text-accent hover:underline">
              MCP setup guide
            </Link>
            {" "}to connect Cursor or other tools to Deckbase.
          </p>
        </>
      )}

      <p className="mt-8 text-white/40 text-sm text-center">
        <Link href="/dashboard" className="hover:text-white/60">Back to dashboard</Link>
      </p>
    </div>
  );
}
