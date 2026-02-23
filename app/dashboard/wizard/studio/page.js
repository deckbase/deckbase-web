"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Sparkles,
  Layers,
  Eye,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getWizardDecks,
  getWizardDeckCards,
  createConcept,
  addConceptToWizardDeck,
} from "@/utils/firestore";

const STEPS = [
  { id: 1, label: "Select deck", icon: Layers },
  { id: 2, label: "Select cards", icon: Check },
  { id: 3, label: "Preview", icon: Eye },
  { id: 4, label: "Generate", icon: Zap },
];

function getCardLabel(card) {
  if (card.isConcept) return card.title || card.prompt || "Concept";
  return card.values?.[0]?.text ?? card.blocksSnapshot?.[0]?.label ?? "Card";
}

export default function CardGenerationStudioPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [wizardDecks, setWizardDecks] = useState([]);
  const [selectedWizardDeckId, setSelectedWizardDeckId] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [error, setError] = useState("");

  const loadWizardDecks = useCallback(async () => {
    if (!user) return;
    const list = await getWizardDecks(user.uid);
    setWizardDecks(list);
  }, [user]);

  const loadWizardDeckCards = useCallback(
    async (wizardDeckId) => {
      if (!user || !wizardDeckId) return;
      setLoading(true);
      try {
        const cards = await getWizardDeckCards(user.uid, wizardDeckId);
        setDeckCards(cards);
        const cardParam = searchParams.get("card");
        if (cardParam) {
          setSelectedCardIds(new Set([cardParam]));
        } else {
          setSelectedCardIds(new Set(cards.map((c) => c.cardId)));
        }
      } finally {
        setLoading(false);
      }
    },
    [user, searchParams]
  );

  useEffect(() => {
    if (user) loadWizardDecks();
  }, [user, loadWizardDecks]);

  useEffect(() => {
    const deckParam = searchParams.get("deck");
    if (deckParam && wizardDecks.some((d) => d.wizardDeckId === deckParam)) {
      setSelectedWizardDeckId(deckParam);
    }
  }, [searchParams, wizardDecks]);

  useEffect(() => {
    if (selectedWizardDeckId && user) loadWizardDeckCards(selectedWizardDeckId);
  }, [selectedWizardDeckId, user, loadWizardDeckCards]);

  // When opened from a card (?deck=...&card=...), skip to Preview (step 3)
  useEffect(() => {
    const deckParam = searchParams.get("deck");
    const cardParam = searchParams.get("card");
    if (!deckParam || !cardParam || loading) return;
    if (selectedWizardDeckId === deckParam && deckCards.length > 0) {
      setStep(3);
    }
  }, [searchParams, selectedWizardDeckId, deckCards.length, loading]);

  const selectedCards = deckCards.filter((c) => selectedCardIds.has(c.cardId));
  const previewRows = selectedCards.map((card) => ({
    cardId: card.cardId,
    title: card.title ?? "",
    description: card.description ?? "",
    isConcept: !!card.isConcept,
  }));

  const canAdvance = () => {
    if (step === 1) return !!selectedWizardDeckId;
    if (step === 2) return selectedCardIds.size > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 4 && canAdvance()) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const toggleCard = (cardId) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const selectAllCards = () => setSelectedCardIds(new Set(deckCards.map((c) => c.cardId)));
  const deselectAllCards = () => setSelectedCardIds(new Set());

  const handleGenerate = async () => {
    if (!user || !selectedWizardDeckId || previewRows.length === 0 || generating) return;
    setGenerating(true);
    setError("");
    let count = 0;
    const rowsToGenerate = previewRows.filter((row) => row.title?.trim() && !row.isConcept);
    try {
      for (const row of rowsToGenerate) {
        if (!row.title?.trim()) continue;
        const res = await fetch("/api/wizard/generate-concept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: row.title,
            description: row.description || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || res.statusText || "Generate failed");
        }
        const data = await res.json();
        await createConcept(user.uid, data);
        await addConceptToWizardDeck(user.uid, selectedWizardDeckId, data.conceptId);
        count++;
      }
      setGeneratedCount(count);
    } catch (e) {
      console.error(e);
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-white/70">Please sign in.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/dashboard/wizard"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Wizard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="w-8 h-8 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Card Generation Studio</h1>
          <p className="text-white/60 text-sm">Step-by-step pipeline. Later: one-click Generate.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap gap-2 mb-8">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.id;
          const done = step > s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-accent text-white" : done ? "bg-white/10 text-white/80" : "bg-white/5 text-white/50"
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              {s.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6"
      >
        {/* Step 1: Select Wizard deck */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Select Wizard deck</h2>
            <p className="text-white/60 text-sm mb-4">Choose the Wizard deck whose cards you want to turn into AI concepts.</p>
            <div className="space-y-2">
              {wizardDecks.length === 0 && (
                <p className="text-white/50 text-sm">No Wizard decks. Create one from the Wizard home.</p>
              )}
              {wizardDecks.map((d) => (
                <button
                  key={d.wizardDeckId}
                  onClick={() => setSelectedWizardDeckId(d.wizardDeckId)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    selectedWizardDeckId === d.wizardDeckId
                      ? "bg-accent/20 border-accent/50 text-white"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Select cards */}
        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Select cards</h2>
            <p className="text-white/60 text-sm mb-3">
              {wizardDecks.find((d) => d.wizardDeckId === selectedWizardDeckId)?.title ?? "Deck"} — choose which cards to generate as AI concepts. (Existing concepts are listed but skipped on Generate.)
            </p>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={selectAllCards} className="text-sm text-accent hover:underline">
                Select all
              </button>
              <span className="text-white/30">|</span>
              <button onClick={deselectAllCards} className="text-sm text-white/60 hover:underline">
                Deselect all
              </button>
              <span className="text-white/50 text-sm ml-auto">{selectedCardIds.size} selected</span>
            </div>
            {loading ? (
              <p className="text-white/50">Loading cards…</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {deckCards.map((card) => {
                  const isSelected = selectedCardIds.has(card.cardId);
                  return (
                    <button
                      key={card.cardId}
                      onClick={() => toggleCard(card.cardId)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center gap-3 ${
                        isSelected ? "bg-accent/20 border-accent/50" : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded border-2 border-current flex items-center justify-center">
                        {isSelected ? <Check className="w-3 h-3" /> : null}
                      </span>
                      <span className="truncate text-white">{getCardLabel(card) || "Untitled"}</span>
                      {card.isConcept && <span className="text-xs text-white/40 shrink-0">(concept)</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Preview</h2>
            <p className="text-white/60 text-sm mb-4">Extracted title and description per card. Empty titles are skipped when generating.</p>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {previewRows.map((row) => (
                <div
                  key={row.cardId}
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <p className="font-medium text-white truncate">{row.title || "(no title)"}{row.isConcept ? " (concept)" : ""}</p>
                  {row.description ? (
                    <p className="text-sm text-white/60 line-clamp-2 mt-1">{row.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 4: Generate */}
        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Generate</h2>
            <p className="text-white/60 text-sm mb-4">
              {previewRows.filter((r) => r.title?.trim() && !r.isConcept).length} cards will be sent to AI (Anthropic + Fal) and added to this deck (&quot;{wizardDecks.find((d) => d.wizardDeckId === selectedWizardDeckId)?.title ?? "deck"}&quot;). Existing concepts are skipped.
            </p>
            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}
            {generatedCount > 0 && (
              <p className="text-green-400 text-sm mb-4">Generated and added {generatedCount} concept(s).</p>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating || previewRows.filter((r) => r.title?.trim() && !r.isConcept).length === 0}
              className="w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {generating ? "Generating…" : <><Zap className="w-5 h-5" /> Generate with AI</>}
            </button>
          </>
        )}
      </motion.div>

      <div className="flex justify-between mt-6">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
