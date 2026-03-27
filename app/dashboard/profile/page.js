"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile, uploadImage } from "@/utils/firestore";
import { checkStorageBeforeUpload } from "@/lib/storage-check-client";
import { useRevenueCat, DEFAULT_ENTITLEMENT_ID } from "@/contexts/RevenueCatContext";
import {
  User,
  Loader2,
  Check,
  Camera,
  ArrowLeft,
  Crown,
  Key,
  Calendar,
  CreditCard,
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
  const { isPro, isVip, customerInfo } = useRevenueCat();
  const fileInputRef = useRef(null);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);

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

  const expiry = formatExpiry(customerInfo, DEFAULT_ENTITLEMENT_ID);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-white/35 hover:text-white/70 text-sm mb-8 transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        Dashboard
      </Link>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-5 overflow-hidden rounded-2xl border border-white/[0.07]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.07] via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-12 w-72 h-72 rounded-full bg-accent/[0.05] blur-3xl pointer-events-none" />

        <div className="relative px-6 py-7 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0 w-fit">
              {(userProfile?.profileUrl || user?.photoURL) ? (
                <img
                  src={userProfile?.profileUrl || user?.photoURL}
                  alt=""
                  width={72}
                  height={72}
                  className="w-[72px] h-[72px] rounded-2xl object-cover ring-1 ring-white/20"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-accent/25 to-accent/10 ring-1 ring-accent/20 flex items-center justify-center text-2xl font-semibold text-white">
                  {(userProfile?.displayName || user?.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-[#1c1c1e] border border-white/[0.15] text-white/50 hover:text-white hover:border-white/30 transition-all disabled:opacity-50 shadow-lg"
                title="Change photo"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_IMAGE}
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight truncate">
                {userProfile?.displayName || user?.email?.split("@")[0] || "Your Profile"}
              </h1>
              <p className="text-white/40 text-sm mt-0.5 truncate">{user?.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2.5 py-1 border ${
                  isPro
                    ? "bg-accent/10 border-accent/25 text-accent"
                    : "bg-white/[0.04] border-white/10 text-white/40"
                }`}>
                  <Crown className="w-3 h-3" />
                  {isPro ? (isVip ? "VIP" : "Pro") : "Free plan"}
                </span>
                {expiry && (
                  <span className="inline-flex items-center gap-1 text-xs text-white/35">
                    <Calendar className="w-3 h-3" />
                    through {expiry}
                  </span>
                )}
              </div>
            </div>

            {userProfile?.profileUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploadingPhoto}
                className="shrink-0 text-xs text-white/25 hover:text-red-400 transition-colors self-start sm:self-center disabled:opacity-40"
              >
                Remove photo
              </button>
            )}
          </div>

          {photoError && (
            <p className="mt-3 text-sm text-red-400">{photoError}</p>
          )}
        </div>
      </motion.div>

      {/* ── 2-col grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 mb-5">
        {/* Personal info */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <User className="w-3.5 h-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-white/90">Personal info</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-sm text-white/45 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1.5">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-accent/50 focus:bg-white/[0.04] focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                maxLength={100}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover px-4 py-2.5 text-sm text-white font-medium transition-all disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : null}
              {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
            </button>
          </form>
        </motion.section>

      </div>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6"
      >
        <h2 className="text-sm font-semibold text-white/90 mb-4">Account settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/dashboard/subscription"
            className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/80 hover:bg-white/[0.05] hover:border-white/[0.14] transition-all"
          >
            <CreditCard className="w-4 h-4 text-white/45" />
            Subscription
          </Link>
          <Link
            href="/dashboard/api-keys"
            className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/80 hover:bg-white/[0.05] hover:border-white/[0.14] transition-all"
          >
            <Key className="w-4 h-4 text-white/45" />
            API keys
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
