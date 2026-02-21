"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mic, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import {
  createCard,
  getDecks,
  getSpeechPeople,
  subscribeToAnalysisSession,
} from "@/utils/firestore";

const SECTION_LIMIT = 25;

const PATTERN_KIND_LABELS = {
  VPO: "Verb + Prep + Object",
  phrasal: "Phrasal Verb",
  VO: "Verb + Object",
  adjn: "Adj + Noun",
  nn: "Noun + Noun",
};

const formatNumber = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric.toLocaleString();
  return String(value);
};

const formatPatternKind = (kind) =>
  PATTERN_KIND_LABELS[kind] || kind || "Pattern";

const buildSpeechCardContent = ({ item, type, speakerLabel }) => {
  const term = item?.t || "Speech item";
  const lines = ["Source: Speech analysis"];
  if (speakerLabel) lines.push(`Speaker: ${speakerLabel}`);
  if (type === "vocabulary") {
    lines.push("Category: Vocabulary");
    if (item?.c !== undefined) lines.push(`Count: ${formatNumber(item.c)}`);
    if (item?.p10k !== undefined)
      lines.push(`Per 10k: ${formatNumber(item.p10k)}`);
  } else if (type === "learning") {
    lines.push("Category: Learning phrase");
    if (item?.c !== undefined) lines.push(`Count: ${formatNumber(item.c)}`);
    if (item?.df !== undefined) lines.push(`Docs: ${formatNumber(item.df)}`);
    if (item?.s !== undefined) lines.push(`Score: ${formatNumber(item.s)}`);
  } else if (type === "patterns") {
    lines.push("Category: Pattern phrase");
    if (item?.kind) lines.push(`Pattern: ${formatPatternKind(item.kind)}`);
    if (item?.c !== undefined) lines.push(`Count: ${formatNumber(item.c)}`);
  } else if (type === "signature") {
    lines.push("Category: Signature phrase");
    if (item?.c !== undefined) lines.push(`Count: ${formatNumber(item.c)}`);
    if (item?.s !== undefined) lines.push(`Score: ${formatNumber(item.s)}`);
  }
  return { frontText: term, backText: lines.join("\n") };
};

const getItemKey = (type, item) =>
  `${type}-${item?.t || "item"}-${item?.kind || ""}`;

function SpeechItem({ title, meta, onAdd, disabled, adding, showAddButton = true }) {
  const metaText = Array.isArray(meta)
    ? meta.filter(Boolean).join(" | ")
    : meta;
  return (
    <div className="flex items-start justify-between gap-3 bg-black/30 border border-white/10 rounded-lg p-3">
      <div className="min-w-0 flex-1">
        <p className="text-white font-medium line-clamp-2">{title}</p>
        {metaText && <p className="text-white/40 text-xs mt-1">{metaText}</p>}
      </div>
      {showAddButton && (
        <button
          onClick={onAdd}
          disabled={disabled}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            disabled
              ? "bg-white/5 text-white/40 cursor-not-allowed"
              : "bg-accent/20 text-accent hover:bg-accent/30"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {adding ? "Adding..." : "Add to deck"}
        </button>
      )}
    </div>
  );
}

export default function SpeechPersonPage() {
  const { user } = useAuth();
  const params = useParams();
  const personId = params?.personId ?? "";

  const [person, setPerson] = useState(null);
  const [loadingPerson, setLoadingPerson] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [decks, setDecks] = useState([]);
  const [notice, setNotice] = useState(null);
  const [addingKey, setAddingKey] = useState(null);
  const [pendingAdd, setPendingAdd] = useState(null);

  useEffect(() => {
    if (!user || !personId) return;
    let isMounted = true;
    setLoadingPerson(true);
    getSpeechPeople()
      .then((list) => {
        if (!isMounted) return;
        const p = list.find((x) => x.personId === personId) ?? null;
        setPerson(p);
        setLoadingPerson(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPerson(null);
        setLoadingPerson(false);
      });
    return () => { isMounted = false; };
  }, [user, personId]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    getDecks(user.uid)
      .then((list) => {
        if (!isMounted) return;
        setDecks(list);
      })
      .catch(() => {
        if (isMounted) setDecks([]);
      });
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (!personId) {
      setAnalysis(null);
      setAnalysisLoading(false);
      return;
    }
    setAnalysis(null);
    setAnalysisLoading(true);
    const unsub = subscribeToAnalysisSession(personId, (data) => {
      setAnalysis(data);
      setAnalysisLoading(false);
    });
    return () => unsub?.();
  }, [personId]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const speakerLabel = person?.displayName || personId;

  const vocabularyItems = useMemo(
    () => (analysis?.vocabulary || []).slice(0, SECTION_LIMIT),
    [analysis?.vocabulary],
  );
  const learningItems = useMemo(
    () => (analysis?.learningPhrases || []).slice(0, SECTION_LIMIT),
    [analysis?.learningPhrases],
  );
  const patternItems = useMemo(
    () => (analysis?.patternPhrases || []).slice(0, SECTION_LIMIT),
    [analysis?.patternPhrases],
  );
  const signatureItems = useMemo(
    () => (analysis?.signaturePhrases || []).slice(0, SECTION_LIMIT),
    [analysis?.signaturePhrases],
  );

  const handleAddToDeck = async (deckId) => {
    if (!user || !pendingAdd) return;
    const { item, type } = pendingAdd;
    const itemKey = getItemKey(type, item);
    setAddingKey(itemKey);
    setPendingAdd(null);
    setNotice(null);
    const deck = decks.find((d) => d.deckId === deckId);
    try {
      const { frontText, backText } = buildSpeechCardContent({
        item,
        type,
        speakerLabel,
      });
      const frontBlockId = uuidv4();
      const backBlockId = uuidv4();
      const blocksSnapshot = [
        { blockId: frontBlockId, type: "header1", label: "Front", required: true },
        { blockId: backBlockId, type: "text", label: "Back", required: true },
      ];
      const values = [
        { blockId: frontBlockId, type: "header1", text: frontText },
        { blockId: backBlockId, type: "text", text: backText },
      ];
      await createCard(user.uid, deckId, blocksSnapshot, values);
      setNotice({
        type: "success",
        message: `Added to ${deck?.title || "deck"}.`,
      });
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Unable to add card." });
    } finally {
      setAddingKey(null);
    }
  };

  const openDeckPicker = (item, type) => {
    const itemKey = getItemKey(type, item);
    setPendingAdd({ itemKey, item, type });
  };

  const hasAnalysis = Boolean(
    analysis?.vocabulary?.length ||
      analysis?.learningPhrases?.length ||
      analysis?.patternPhrases?.length ||
      analysis?.signaturePhrases?.length,
  );

  if (!personId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/speech"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Speech
        </Link>
        <p className="text-white/50">No person specified.</p>
      </div>
    );
  }

  if (loadingPerson) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/speech"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Speech
        </Link>
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/speech"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Speech
        </Link>
        <p className="text-white/50">Speaker not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/dashboard/speech"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Speech
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
          {person.imageUrl ? (
            <img
              src={person.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white/70 text-xl font-medium">
              {(person.displayName || "?")[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">
            {person.displayName || personId}
          </h1>
          <p className="text-white/50 text-sm">
            Top words and phrases. Add any to your deck.
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

      {pendingAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setPendingAdd(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="deck-picker-title"
        >
          <div
            className="bg-gray-900 border border-white/20 rounded-xl p-5 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="deck-picker-title" className="text-lg font-semibold text-white mb-1">
              Add to deck
            </h2>
            <p className="text-white/60 text-sm mb-4 line-clamp-2">
              &ldquo;{pendingAdd.item?.t || "Item"}&rdquo;
            </p>
            {decks.length === 0 ? (
              <p className="text-white/50 text-sm">No decks yet. Create a deck first.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {decks.map((d) => (
                  <li key={d.deckId}>
                    <button
                      type="button"
                      onClick={() => handleAddToDeck(d.deckId)}
                      disabled={addingKey === pendingAdd.itemKey}
                      className="w-full text-left px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-accent/20 hover:border-accent/40 disabled:opacity-50 transition-colors"
                    >
                      {d.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setPendingAdd(null)}
              className="mt-4 w-full py-2 rounded-lg text-white/60 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {analysisLoading && (
        <div className="text-center py-12 text-white/50">Loading analysis…</div>
      )}

      {!analysisLoading && !hasAnalysis && (
        <div className="text-center py-12 text-white/50">
          No analysis yet for this person. Analysis is run from Admin → Speech
          Analysis.
        </div>
      )}

      {!analysisLoading && hasAnalysis && (
        <div className="space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-2">
              Top vocabulary
            </h2>
            <p className="text-white/40 text-sm mb-3">
              {vocabularyItems.length} items
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vocabularyItems.map((item) => {
                const itemKey = getItemKey("vocabulary", item);
                return (
                  <SpeechItem
                    key={itemKey}
                    title={item.t}
                    meta={[
                      `Count: ${formatNumber(item.c)}`,
                      item.p10k !== undefined
                        ? `Per 10k: ${formatNumber(item.p10k)}`
                        : null,
                    ]}
                    onAdd={() => openDeckPicker(item, "vocabulary")}
                    disabled={addingKey === itemKey}
                    adding={addingKey === itemKey}
                    showAddButton={false}
                  />
                );
              })}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-2">
              Learning phrases
            </h2>
            <p className="text-white/40 text-sm mb-3">
              {learningItems.length} items
            </p>
            <div className="space-y-3">
              {learningItems.map((item) => {
                const itemKey = getItemKey("learning", item);
                return (
                  <SpeechItem
                    key={itemKey}
                    title={item.t}
                    meta={[
                      `Count: ${formatNumber(item.c)}`,
                      `Docs: ${formatNumber(item.df)}`,
                      item.s !== undefined
                        ? `Score: ${formatNumber(item.s)}`
                        : null,
                    ]}
                    onAdd={() => openDeckPicker(item, "learning")}
                    disabled={addingKey === itemKey}
                    adding={addingKey === itemKey}
                    showAddButton={false}
                  />
                );
              })}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-2">
              Pattern phrases
            </h2>
            <p className="text-white/40 text-sm mb-3">
              {patternItems.length} items
            </p>
            <div className="space-y-3">
              {patternItems.map((item) => {
                const itemKey = getItemKey("patterns", item);
                return (
                  <SpeechItem
                    key={itemKey}
                    title={item.t}
                    meta={[
                      `Pattern: ${formatPatternKind(item.kind)}`,
                      `Count: ${formatNumber(item.c)}`,
                      `Docs: ${formatNumber(item.df)}`,
                    ]}
                    onAdd={() => openDeckPicker(item, "patterns")}
                    disabled={addingKey === itemKey}
                    adding={addingKey === itemKey}
                    showAddButton={false}
                  />
                );
              })}
            </div>
          </section>

          {signatureItems.length > 0 && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-2">
                Signature phrases
              </h2>
              <p className="text-white/40 text-sm mb-3">
                {signatureItems.length} items
              </p>
              <div className="space-y-3">
                {signatureItems.map((item) => {
                  const itemKey = getItemKey("signature", item);
                  return (
                    <SpeechItem
                      key={itemKey}
                      title={item.t}
                      meta={[
                        `Count: ${formatNumber(item.c)}`,
                        item.dist !== undefined
                          ? `Distinctiveness: ${formatNumber(item.dist)}`
                          : null,
                        item.s !== undefined
                          ? `Score: ${formatNumber(item.s)}`
                          : null,
                      ]}
                      onAdd={() => openDeckPicker(item, "signature")}
                      disabled={addingKey === itemKey}
                      adding={addingKey === itemKey}
                      showAddButton={false}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
