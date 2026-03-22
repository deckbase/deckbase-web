"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getCuratedVoicesNormalized } from "@/lib/elevenlabs-voices";
import {
  playElevenlabsVoiceSample,
  alertElevenlabsVoiceSampleError,
} from "@/lib/elevenlabs-voice-sample-client";

/**
 * Deckbase-curated ElevenLabs voice dropdown (see docs/api/ELEVENLABS_VOICES.md).
 */
export default function ElevenlabsVoicePicker({
  value,
  onChange,
  disabled = false,
  allowEmpty = false,
  emptyLabel = "No default (use template / block)",
  size = "md",
  showPlaySample = true,
}) {
  const { user } = useAuth();
  const getIdToken = useCallback(() => user?.getIdToken(), [user]);
  const playAbortRef = useRef(null);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);

  const curatedVoices = useMemo(() => getCuratedVoicesNormalized(), []);

  const languageOptions = useMemo(() => {
    const byCode = new Map();
    for (const v of curatedVoices) {
      if (v.language && !byCode.has(v.language)) {
        byCode.set(v.language, v.group);
      }
    }
    return [...byCode.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [curatedVoices]);

  const [languageFilter, setLanguageFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  const filteredVoices = useMemo(() => {
    return curatedVoices.filter((v) => {
      if (languageFilter && v.language !== languageFilter) return false;
      if (genderFilter && v.gender !== genderFilter) return false;
      return true;
    });
  }, [curatedVoices, languageFilter, genderFilter]);

  const selectedVoice = useMemo(
    () => curatedVoices.find((v) => v.id === value),
    [curatedVoices, value],
  );

  const selectionHiddenByFilter = Boolean(
    selectedVoice && filteredVoices.every((v) => v.id !== value),
  );

  /** Stored configs may still reference removed / non-catalog voice ids — coerce to a valid pick. */
  useEffect(() => {
    if (!value) return;
    if (curatedVoices.some((v) => v.id === value)) return;
    onChange(allowEmpty ? "" : curatedVoices[0]?.id ?? "");
  }, [value, curatedVoices, allowEmpty, onChange]);

  const playSample = useCallback(
    async (voiceId) => {
      if (!voiceId) return;
      playAbortRef.current?.abort();
      const ac = new AbortController();
      playAbortRef.current = ac;
      setPlayingVoiceId(voiceId);
      try {
        await playElevenlabsVoiceSample({
          voiceId,
          getIdToken,
          signal: ac.signal,
        });
      } catch (e) {
        if (e?.name !== "AbortError") alertElevenlabsVoiceSampleError(e);
      } finally {
        if (playAbortRef.current === ac) playAbortRef.current = null;
        setPlayingVoiceId(null);
      }
    },
    [getIdToken],
  );

  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const pad = size === "sm" ? "px-2 py-1.5" : "px-3 py-2";
  const selectClass = `rounded-lg border border-white/10 bg-black/30 text-white focus:border-accent/50 focus:outline-none ${pad} ${textSize}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[9rem] sm:max-w-[14rem]">
          <span className={`text-white/45 ${textSize}`}>Language</span>
          <select
            aria-label="Filter by language"
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            disabled={disabled}
            className={`${selectClass} w-full`}
          >
            <option value="">All languages</option>
            {languageOptions.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[7rem] sm:max-w-[10rem]">
          <span className={`text-white/45 ${textSize}`}>Gender</span>
          <select
            aria-label="Filter by gender"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            disabled={disabled}
            className={`${selectClass} w-full`}
          >
            <option value="">Any</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        <select
          aria-label="Voice"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`min-w-0 flex-1 ${selectClass}`}
        >
          {allowEmpty && <option value="">{emptyLabel}</option>}
          {selectionHiddenByFilter && selectedVoice && (
            <option value={value}>{selectedVoice.label} (current)</option>
          )}
          {filteredVoices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        {showPlaySample && (
          <button
            type="button"
            onClick={() => playSample(value)}
            disabled={disabled || !value}
            title="Play cached sample (same phrase as the server cache)"
            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 ${textSize}`}
          >
            {playingVoiceId === value ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
            ) : (
              <Volume2 className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
            )}
            <span className="hidden sm:inline">Sample</span>
          </button>
        )}
      </div>
    </div>
  );
}
