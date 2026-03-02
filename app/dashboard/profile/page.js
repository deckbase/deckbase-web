"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile, uploadImage } from "@/utils/firestore";
import { User, Loader2, Check, Camera, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/gif";
const MAX_SIZE_MB = 2;

export default function ProfilePage() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const fileInputRef = useRef(null);
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
        <User className="w-8 h-8 text-accent" />
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {userProfile?.profileUrl ? (
              <Image
                src={userProfile.profileUrl}
                alt="Profile"
                width={80}
                height={80}
                className="rounded-full border-2 border-white/20 object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center border-2 border-white/20">
                <User className="w-10 h-10 text-accent" />
              </div>
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
      </div>

      <p className="mt-6 text-white/40 text-sm text-center">
        <Link href="/dashboard" className="hover:text-white/60">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
