"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mic, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSpeechPeople,
  updateSpeechPerson,
  uploadPersonImage,
} from "@/utils/firestore";

export default function EditSpeakerPage() {
  const { user } = useAuth();
  const params = useParams();
  const personId = params?.personId ?? "";

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notice, setNotice] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user || !personId) return;
    let isMounted = true;
    setLoading(true);
    getSpeechPeople()
      .then((list) => {
        if (!isMounted) return;
        const p = list.find((x) => x.personId === personId) ?? null;
        setPerson(p);
        if (p) {
          setDisplayName(p.displayName || "");
          setImageUrl(p.imageUrl || "");
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPerson(null);
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, [user, personId]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!personId || !person) return;
    setSaving(true);
    setNotice(null);
    try {
      await updateSpeechPerson(personId, {
        displayName: displayName.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      });
      setNotice({ type: "success", message: "Speaker updated." });
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Failed to save. Try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !personId) return;
    const accepted = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (file.type && !accepted.includes(file.type)) {
      setNotice({ type: "error", message: "Please choose a JPEG, PNG, GIF, or WebP image." });
      return;
    }
    setUploadingImage(true);
    setNotice(null);
    try {
      const url = await uploadPersonImage(personId, file);
      setImageUrl(url);
      await updateSpeechPerson(personId, { imageUrl: url });
      setNotice({ type: "success", message: "Image uploaded and saved." });
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Upload failed. Try again or use Image URL." });
    } finally {
      setUploadingImage(false);
      if (fileInputRef?.current) fileInputRef.current.value = "";
    }
  };

  if (!personId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <p className="text-white/50">No speaker specified.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <p className="text-white/50">Speaker not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Speech Analysis
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Mic className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit speaker</h1>
          <p className="text-white/50 text-sm">
            Update name and image for this speaker.
          </p>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            notice.type === "error"
              ? "bg-red-500/20 text-red-200"
              : "bg-green-500/20 text-green-200"
          }`}
        >
          {notice.message}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Speaker name"
            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
            Image
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white/40 text-2xl font-medium">
                  {(displayName || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50 text-sm"
              />
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef?.current?.click()}
                  disabled={uploadingImage}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? "Uploading…" : "Upload image"}
                </button>
                <span className="text-white/40 text-xs">
                  JPEG, PNG, GIF, or WebP
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/dashboard/admin/speech/${personId}`}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
