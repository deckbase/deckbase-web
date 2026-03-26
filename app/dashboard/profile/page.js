"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile, uploadImage } from "@/utils/firestore";
import { checkStorageBeforeUpload } from "@/lib/storage-check-client";
import { useRevenueCat, DEFAULT_ENTITLEMENT_ID } from "@/contexts/RevenueCatContext";
import {
  User,
  Loader2,
  Check,
  Camera,
  X,
  ArrowLeft,
  Key,
  Copy,
  Trash2,
  Crown,
  ExternalLink,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/gif";
const MAX_SIZE_MB = 2;

function formatExpiry(customerInfo, entitlementId = "pro") {
  const entitlements = customerInfo?.entitlements;
  if (!entitlements) return null;
  const ent = entitlements[entitlementId] ?? entitlements.all?.[entitlementId];
  const date = ent?.expirationDate ?? ent?.expiresDate;
  if (!date) return null;
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { isPro, isVip, customerInfo, loading, isConfigured } = useRevenueCat();
  const fileInputRef = useRef(null);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);

  // API keys
  const [apiKeys, setApiKeys] = useState([]);
  const [newKey, setNewKey] = useState(null);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");

  useEffect(() => {
    if (userProfile?.displayName != null) {
      setDisplayName(userProfile.displayName);
    } else if (user?.email) {
      setDisplayName(user.email.split("@")[0] || "");
    }
  }, [userProfile?.displayName, user?.email]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() });
      await refreshUserProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Profile update failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.uid) return;
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setPhotoError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    const storageCheck = await checkStorageBeforeUpload(user, file.size);
    if (!storageCheck.allowed) {
      setPhotoError(storageCheck.message || "Cloud backup limit reached.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const { downloadUrl } = await uploadImage(user.uid, file);
      await updateUserProfile(user.uid, { profileUrl: downloadUrl });
      await refreshUserProfile();
    } catch (err) {
      console.error("Profile photo upload failed:", err);
      setPhotoError(err?.message || "Upload failed. Try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.uid) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      await updateUserProfile(user.uid, { profileUrl: "" });
      await refreshUserProfile();
    } catch (err) {
      console.error("Remove photo failed:", err);
      setPhotoError(err?.message || "Could not remove photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

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

  const expiry = formatExpiry(customerInfo, DEFAULT_ENTITLEMENT_ID);
  const manageUrl = customerInfo?.managementURL;
  const showManageBlock = manageUrl && !isVip;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.025] mb-7"
      >
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 p-6 sm:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60 mb-4">
              <User className="w-3.5 h-3.5" />
              Account Control Center
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-white">
              Your Profile
            </h1>
            <p className="mt-2 max-w-xl text-[13px] text-white/40">
              One command surface for identity, billing, and API access. Built for fast account ops, not hunting through tabs.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">Plan status</p>
            <div className="mt-2 flex items-center gap-2">
              <Crown className={`w-4 h-4 ${isPro ? "text-accent" : "text-white/40"}`} />
              <p className="text-white/85 text-sm font-medium">{isPro ? (isVip ? "VIP active" : "Pro active") : "Free plan"}</p>
            </div>
            <p className="mt-2 text-xs text-white/40">{user?.email ?? "No email"}</p>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 space-y-6"
        >
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white tracking-tight">Personal info</h2>
          </div>
        {/* Avatar: user's uploaded photo first (profileUrl), then provider (e.g. Google), then initial */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {(userProfile?.profileUrl || user?.photoURL) ? (
              <img
                src={userProfile?.profileUrl || user?.photoURL}
                alt=""
                width={80}
                height={80}
                className="w-20 h-20 rounded-full border-2 border-white/20 object-cover"
              />
            ) : (
              <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-accent text-2xl font-semibold text-white">
                {(userProfile?.displayName || user?.email || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-sm">Profile photo</p>
            <p className="text-white/40 text-xs mt-0.5 mb-3">
              JPEG, PNG, WebP or GIF under {MAX_SIZE_MB} MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_IMAGE}
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10 transition-colors disabled:opacity-60"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {uploadingPhoto ? "Uploading…" : "Change photo"}
              </button>
              {userProfile?.profileUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-red-300 hover:border-red-500/30 transition-colors disabled:opacity-60"
                >
                  <X className="w-4 h-4" />
                  Remove photo
                </button>
              )}
            </div>
            {photoError && (
              <p className="mt-2 text-sm text-red-400">{photoError}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white/80 cursor-not-allowed"
            />
          </div>

          {/* Display name (editable) */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              maxLength={100}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-hover px-4 py-2.5 text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : null}
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
        </form>
        </motion.section>

        <motion.section
          id="subscription"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-semibold text-white tracking-tight">Subscription</h2>
          </div>

          {!isConfigured && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Subscription billing is not configured yet.
            </div>
          )}

          {isConfigured && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/60">Current plan</p>
                <p className="text-white text-lg font-medium mt-1">
                  {loading ? "Checking..." : isPro ? (isVip ? "Pro (VIP)" : "Pro") : "Free"}
                </p>
                {expiry && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/60">
                    <Calendar className="h-3.5 w-3.5" />
                    Active through {expiry}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/subscription"
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  Compare plans
                </Link>
                {showManageBlock && (
                  <a
                    href={manageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Manage billing
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.section>
      </div>

      <motion.section
        id="api-keys"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-white tracking-tight">API keys</h2>
        </div>

        {!isPro && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
            <p className="text-amber-200 font-medium mb-2">Pro or VIP required</p>
            <p className="text-white/70 text-sm">
              Upgrade to create and manage API keys for MCP tools like Cursor.
            </p>
          </div>
        )}

        {isPro && (
          <div className="space-y-5">
            {apiKeyError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
                {apiKeyError}
              </div>
            )}

            <form onSubmit={handleCreateApiKey} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
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
                {creating ? "Creating..." : "Create API key"}
              </button>
            </form>

            {newKey && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-amber-200 text-sm font-medium mb-1">
                  Copy this key now. We will not show it again.
                </p>
                {newKey.name && (
                  <p className="text-white/60 text-xs mb-2">
                    Name: <span className="text-white/80">{newKey.name}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-white/90 text-sm break-all flex-1 min-w-0 bg-black/30 px-2 py-1 rounded">
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
              <ul className="space-y-2">
                {apiKeys.map((k) => (
                  <li
                    key={k.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-white/90">{k.name ?? k.label}</span>
                      <p className="text-white/50 text-xs mt-0.5">
                        Created {k.createdAt ? new Date(k.createdAt).toLocaleString() : "-"}
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
            )}

            <p className="text-white/50 text-sm">
              Use these keys with the{" "}
              <Link href="/mcp" className="text-accent hover:underline">
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
