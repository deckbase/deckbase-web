"use client";

import { motion } from "framer-motion";
import { Cpu, ChevronDown, ChevronUp, Copy, Check, Key, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import Link from "next/link";

export default function McpPage() {
  const [showProjectConfig, setShowProjectConfig] = useState(false);
  const [showOtherTools, setShowOtherTools] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [apiKeysError, setApiKeysError] = useState("");
  const { user, loading } = useAuth();
  const { isPro } = useRevenueCat();
  const canUseMcp = !!user && isPro;

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-app.vercel.app";

  const mcpUrl = `${baseUrl}/api/mcp`;

  const handleCopyToken = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken(true);
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy token", e);
    }
  };

  const fetchApiKeys = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setApiKeys(data.keys || []);
      setApiKeysError("");
    } catch (e) {
      setApiKeysError(e.message || "Failed to load API keys");
      setApiKeys([]);
    }
  }, [user]);

  useEffect(() => {
    if (user && isPro) fetchApiKeys();
    else setApiKeys([]);
  }, [user, isPro, fetchApiKeys]);

  const handleCreateApiKey = async () => {
    if (!user || creating) return;
    setCreating(true);
    setApiKeysError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: "MCP" }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(JSON.parse(t)?.error || t);
      }
      const data = await res.json();
      setNewKey({ key: data.key, id: data.id, label: data.label, createdAt: data.createdAt });
      fetchApiKeys();
    } catch (e) {
      setApiKeysError(e.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyApiKey = async (keyToCopy) => {
    try {
      await navigator.clipboard.writeText(keyToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!user || revokingId) return;
    setRevokingId(keyId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/api-keys/${encodeURIComponent(keyId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to revoke");
      setNewKey((prev) => (prev?.id === keyId ? null : prev));
      fetchApiKeys();
    } catch {
      setApiKeysError("Failed to revoke key");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent mb-6">
            <Cpu className="w-4 h-4" />
            <span className="text-sm font-medium">Model Context Protocol</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Connecting to Deckbase MCP
          </h1>

          <p className="text-lg text-white/70 mb-12">
            This guide walks you through connecting your AI tool to Deckbase using
            the Model Context Protocol (MCP). Once connected, your tool can read
            Deckbase project docs and use tools like{" "}
            <code className="text-accent">list_docs</code> and{" "}
            <code className="text-accent">read_doc</code>. Authentication uses
            Firebase; you need a valid Firebase ID token in the{" "}
            <code className="text-accent">Authorization</code> header.
          </p>

          {/* API keys (recommended) */}
          <h2 className="text-2xl font-bold text-white mb-4">
            API keys (recommended)
          </h2>
          <p className="text-white/70 mb-4">
            API keys don&apos;t expire. Create one and use it in your MCP config
            instead of a Firebase token so you don&apos;t have to refresh every hour.
          </p>
          {!loading && user && (
            <>
              {!isPro && (
                <div className="p-6 rounded-xl bg-amber-950/30 border border-amber-600/40 mb-6">
                  <p className="text-amber-200 font-medium mb-2">
                    MCP is available for Pro and VIP subscribers
                  </p>
                  <p className="text-white/70 text-sm mb-4">
                    Upgrade to create API keys and connect Cursor to Deckbase.
                  </p>
                  <Link
                    href="/dashboard/subscription"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
                  >
                    View subscription
                  </Link>
                </div>
              )}
              {canUseMcp && (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-10 space-y-4">
              {apiKeysError && (
                <p className="text-red-400 text-sm">{apiKeysError}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateApiKey}
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  <Key className="w-4 h-4" />
                  {creating ? "Creating…" : "Create API key"}
                </button>
              </div>
              {newKey && (
                <div className="rounded-lg bg-amber-950/40 border border-amber-700/50 p-4">
                  <p className="text-amber-200 text-sm font-medium mb-2">
                    Copy this key now. We won&apos;t show it again.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-white/90 text-sm break-all flex-1 min-w-0">
                      {newKey.key}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyApiKey(newKey.key)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-sm"
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
                  <p className="text-white/70 text-sm mb-2">Your API keys</p>
                  <ul className="space-y-2">
                    {apiKeys.map((k) => (
                      <li
                        key={k.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-white/10 last:border-0"
                      >
                        <span className="text-white/80 text-sm">
                          {k.label} · created {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : ""}
                          {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRevokeKey(k.id)}
                          disabled={revokingId === k.id}
                          className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
              )}
            </>
          )}
          {!loading && !user && (
            <p className="text-white/60 mb-10">
              Log in to create and manage API keys.
            </p>
          )}

          {/* Generate token */}
          <h2 className="text-2xl font-bold text-white mb-4">
            Generate your token
          </h2>
          {!loading && (
            <>
              {canUseMcp ? (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-10">
                  <p className="text-white/70 mb-4">
                    You&apos;re logged in. Click the button below to copy your
                    current Firebase ID token. Paste it into your MCP config as{" "}
                    <code className="text-accent">YOUR_TOKEN_OR_API_KEY</code>.
                    The token expires in about an hour; prefer an API key above.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy my MCP token
                      </>
                    )}
                  </button>
                </div>
              ) : user ? (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-10">
                  <p className="text-white/70 mb-4">
                    MCP is available for Pro and VIP subscribers. Upgrade to copy
                    a token or create an API key.
                  </p>
                  <Link
                    href="/dashboard/subscription"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
                  >
                    View subscription
                  </Link>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-10">
                  <p className="text-white/70 mb-4">
                    Log in to Deckbase to generate your token. After signing in,
                    return to this page and use the &quot;Copy my MCP token&quot;
                    button (Pro/VIP required).
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
                  >
                    Log in
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Cursor */}
          <h2 className="text-2xl font-bold text-white mb-4">Cursor</h2>
          <ol className="list-decimal list-inside space-y-4 text-white/80 mb-8">
            <li>
              Use an API key (recommended; create one above—it doesn&apos;t expire)
              or a Firebase token. Paste it into the config.
            </li>
            <li>
              Open <strong>Cursor Settings</strong> → <strong>MCP</strong> →{" "}
              <strong>Add new global MCP server</strong> (or edit your existing
              MCP config).
            </li>
            <li>
              Paste the following configuration. Replace{" "}
              <code className="text-accent">YOUR_TOKEN_OR_API_KEY</code> with
              your API key (recommended) or Firebase token:
            </li>
          </ol>
          <pre className="p-4 rounded-lg bg-black/50 text-white/80 text-sm overflow-x-auto mb-6 border border-white/10">
            {`{
  "mcpServers": {
    "deckbase": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_OR_API_KEY"
      }
    }
  }
}`}
          </pre>
          <p className="text-white/60 text-sm mb-8">
            <strong>Note:</strong> Use an API key (doesn&apos;t expire) or a
            Firebase token (expires in ~1 hour). When you get 401 errors with a
            token, get a fresh one and update the config, then restart Cursor.
          </p>

          {/* Project-level configuration */}
          <button
            type="button"
            onClick={() => setShowProjectConfig(!showProjectConfig)}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-2"
          >
            {showProjectConfig ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="font-semibold">Project-level configuration</span>
          </button>
          <p className="text-white/60 text-sm mb-2">
            To share the Deckbase MCP configuration with your team, create a{" "}
            <code className="text-accent">.cursor/mcp.json</code> file in your
            project root:
          </p>
          {showProjectConfig && (
            <pre className="p-4 rounded-lg bg-black/50 text-white/80 text-sm overflow-x-auto mb-8 border border-white/10">
              {`{
  "mcpServers": {
    "deckbase": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_OR_API_KEY"
      }
    }
  }
}`}
            </pre>
          )}

          {/* Other tools */}
          <h2 className="text-2xl font-bold text-white mb-4 mt-12">
            Other tools
          </h2>
          <p className="text-white/70 mb-4">
            If your AI tool isn’t Cursor but supports MCP, you can connect using
            the Deckbase MCP endpoint:
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left text-white/80 border border-white/10 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-4 py-3 font-semibold text-white">
                    Transport
                  </th>
                  <th className="px-4 py-3 font-semibold text-white">URL</th>
                  <th className="px-4 py-3 font-semibold text-white">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/10">
                  <td className="px-4 py-3">Streamable HTTP</td>
                  <td className="px-4 py-3 font-mono text-accent break-all">
                    {mcpUrl}
                  </td>
                  <td className="px-4 py-3">
                    Send{" "}
                    <code className="text-accent">Authorization: Bearer &lt;token&gt;</code>{" "}
                    with every request.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => setShowOtherTools(!showOtherTools)}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-2 mt-4"
          >
            {showOtherTools ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="font-semibold">JSON configuration format</span>
          </button>
          {showOtherTools && (
            <pre className="p-4 rounded-lg bg-black/50 text-white/80 text-sm overflow-x-auto mb-8 border border-white/10">
              {`{
  "mcpServers": {
    "deckbase": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_OR_API_KEY"
      }
    }
  }
}`}
            </pre>
          )}

          {/* Getting your Firebase token */}
          <h2 className="text-2xl font-bold text-white mb-4 mt-12">
            Getting a token (if not using an API key)
          </h2>
          <p className="text-white/70 mb-4">
            <strong>Recommended:</strong> Use an API key (see above); it doesn&apos;t
            expire. If you prefer a Firebase token:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/70 mb-6">
            <li>
              Log in to this Deckbase app, open Developer Tools (F12) → Console,
              and run:{" "}
              <code className="text-accent block mt-1">
                firebase.auth().currentUser.getIdToken().then(t =&gt; console.log(t))
              </code>{" "}
              (if your app exposes <code className="text-accent">firebase</code>{" "}
              globally). Copy the printed token.
            </li>
            <li>
              Or capture the ID token from your app&apos;s client code after
              sign-in (e.g. <code className="text-accent">user.getIdToken()</code>).
            </li>
          </ul>
          <p className="text-white/60 text-sm">
            The token usually expires after about one hour. When the MCP server
            returns 401, get a new token and update the{" "}
            <code className="text-accent">Authorization</code> header in your
            MCP config.
          </p>

          <p className="mt-12 text-white/50 text-sm">
            Full technical details:{" "}
            <code className="text-accent">mcp-server/README.md</code> in the
            repo.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
