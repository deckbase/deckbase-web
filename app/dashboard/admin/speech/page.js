"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createSpeechPerson, getSpeechPeople } from "@/utils/firestore";

export default function AdminSpeechPage() {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [notice, setNotice] = useState(null);
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [isCreatingSpeaker, setIsCreatingSpeaker] = useState(false);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setLoadingPeople(true);
    getSpeechPeople()
      .then((list) => {
        if (!isMounted) return;
        setPeople(list);
        setLoadingPeople(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setPeople([]);
        setLoadingPeople(false);
        setNotice({ type: "error", message: "Unable to load speakers." });
      });
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleCreateSpeaker = async () => {
    if (!newSpeakerName.trim()) {
      setNotice({ type: "error", message: "Enter a speaker name first." });
      return;
    }
    setIsCreatingSpeaker(true);
    setNotice(null);
    try {
      const person = await createSpeechPerson(newSpeakerName);
      setPeople((prev) => {
        const next = [...prev, person];
        next.sort((a, b) =>
          (a.displayName || "").localeCompare(b.displayName || ""),
        );
        return next;
      });
      setNewSpeakerName("");
      setNotice({
        type: "success",
        message: `Speaker "${person.displayName}" created.`,
      });
    } catch (error) {
      console.error("Error creating speaker:", error);
      setNotice({
        type: "error",
        message: "Unable to create speaker. Please try again.",
      });
    } finally {
      setIsCreatingSpeaker(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Mic className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Speech Analysis</h1>
          <p className="text-white/50">
            Choose a speaker to view analysis, or add a new speaker.
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

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <label className="block text-white/60 text-xs uppercase tracking-wide mb-3">
          Speakers
        </label>
        {loadingPeople ? (
          <p className="text-white/50 text-sm">Loading speakers…</p>
        ) : people.length === 0 ? (
          <p className="text-white/50 text-sm">No speakers yet. Add one below.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {people.map((person) => (
              <div
                key={person.personId}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-white min-w-0 group"
              >
                <Link
                  href={`/dashboard/admin/speech/${person.personId}`}
                  className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                    {person.imageUrl ? (
                      <img
                        src={person.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white/70 text-lg font-medium">
                        {(person.displayName || "?")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-medium truncate">
                    {person.displayName || person.personId}
                  </span>
                </Link>
                <Link
                  href={`/dashboard/admin/speech/${person.personId}/edit`}
                  className="flex-shrink-0 p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  title="Edit speaker"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-white/10">
          <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
            Add speaker
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              placeholder="Enter speaker name"
              className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
            />
            <button
              onClick={handleCreateSpeaker}
              disabled={isCreatingSpeaker || !newSpeakerName.trim()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingSpeaker ? "Creating..." : "Create speaker"}
            </button>
          </div>
          <p className="text-white/40 text-xs mt-2">
            Use this if the speaker is not in the list.
          </p>
        </div>
      </div>
    </div>
  );
}
