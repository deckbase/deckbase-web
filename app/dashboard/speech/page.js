"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSpeechPeople } from "@/utils/firestore";

export default function SpeechPage() {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [notice, setNotice] = useState(null);

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
      .catch(() => {
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Mic className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Speech</h1>
          <p className="text-white/50 text-sm">
            Choose a speaker to see their top words and phrases.
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

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <label className="block text-white/60 text-xs uppercase tracking-wide mb-3">
          Speakers
        </label>
        {loadingPeople ? (
          <p className="text-white/50 text-sm">Loading speakers…</p>
        ) : people.length === 0 ? (
          <p className="text-white/50 text-sm">No speakers yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {people.map((person) => (
              <Link
                key={person.personId}
                href={`/dashboard/speech/${person.personId}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-white hover:border-accent/50 hover:bg-accent/10 transition-colors text-left min-w-0"
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
