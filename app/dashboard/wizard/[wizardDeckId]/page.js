"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Swords, X, Trash2, Plus, Download, Check, ChevronLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getWizardDeck,
  getWizardDeckCards,
  getDecks,
  getCards,
  addToWizardDeck,
  removeFromWizardDeck,
  createCardForWizard,
} from "@/utils/firestore";
import { getCardPromptAndAnswer } from "@/utils/wizard";

function getBlockValueText(card, blockId) {
  if (!card?.values || !blockId) return "";
  const v = card.values.find((x) => x.blockId === blockId);
  if (!v) return "";
  if (typeof v.text === "string") return v.text.trim();
  if (Array.isArray(v.items)) return v.items.map(String).join(" ").trim();
  return "";
}

export default function WizardDeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const wizardDeckId = params.wizardDeckId;

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [flashcardDecks, setFlashcardDecks] = useState([]);
  const [importDeckId, setImportDeckId] = useState(null);
  const [importDeckCards, setImportDeckCards] = useState([]);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [importStep, setImportStep] = useState("cards"); // 'cards' | 'map'
  const [importTitleBlockId, setImportTitleBlockId] = useState("");
  const [importDescriptionBlockId, setImportDescriptionBlockId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(null);
  const [removingCardId, setRemovingCardId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPrompt, setCreatePrompt] = useState("");
  const [createAnswer, setCreateAnswer] = useState("");
  const [creating, setCreating] = useState(false);

  const loadDeck = useCallback(async () => {
    if (!user || !wizardDeckId) return;
    setLoading(true);
    setError("");
    try {
      const [deckData, cardList] = await Promise.all([
        getWizardDeck(user.uid, wizardDeckId),
        getWizardDeckCards(user.uid, wizardDeckId),
      ]);
      setDeck(deckData);
      setCards(cardList);
      if (!deckData) setError("Deck not found.");
    } catch (e) {
      console.error(e);
      setError("Failed to load deck.");
    } finally {
      setLoading(false);
    }
  }, [user, wizardDeckId]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  const loadFlashcardDecks = useCallback(async () => {
    if (!user) return;
    const list = await getDecks(user.uid);
    setFlashcardDecks(list);
  }, [user]);

  useEffect(() => {
    if (showImportModal && user) loadFlashcardDecks();
  }, [showImportModal, user, loadFlashcardDecks]);

  const loadDeckCards = useCallback(async (deckId) => {
    if (!user || !deckId) return;
    const list = await getCards(user.uid, deckId);
    setImportDeckCards(list);
    setSelectedCardIds(new Set(list.map((c) => c.cardId)));
  }, [user]);

  const handleSelectDeck = (deckId) => {
    setImportDeckId(deckId);
    setImportDone(null);
    loadDeckCards(deckId);
  };

  const toggleCardSelection = (cardId) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const selectAllCards = () => setSelectedCardIds(new Set(importDeckCards.map((c) => c.cardId)));
  const deselectAllCards = () => setSelectedCardIds(new Set());

  const handleImportSelected = async () => {
    if (!user || !wizardDeckId || !importDeckId || importing || selectedCardIds.size === 0) return;
    setImporting(true);
    setImportDone(null);
    try {
      const selectedCards = importDeckCards.filter((c) => selectedCardIds.has(c.cardId));
      for (const card of selectedCards) {
        const title = importTitleBlockId ? getBlockValueText(card, importTitleBlockId) : "";
        const description = importDescriptionBlockId ? getBlockValueText(card, importDescriptionBlockId) : "";
        await addToWizardDeck(user.uid, wizardDeckId, card.cardId, importDeckId, "import", { title, description });
      }
      setImportDone(selectedCardIds.size);
      setImportStep("cards");
      await loadDeck();
    } catch (e) {
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  const handleRemoveCard = async (cardId) => {
    if (!user || !wizardDeckId) return;
    setRemovingCardId(cardId);
    try {
      await removeFromWizardDeck(user.uid, wizardDeckId, cardId);
      await loadDeck();
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingCardId(null);
    }
  };

  const handleStartBattle = () => {
    router.push(`/dashboard/wizard?deck=${wizardDeckId}`);
  };

  const handleCreateCard = async () => {
    if (!user || !wizardDeckId || creating) return;
    const prompt = createPrompt.trim();
    if (!prompt) return;
    setCreating(true);
    try {
      await createCardForWizard(user.uid, wizardDeckId, prompt, createAnswer.trim());
      setShowCreateModal(false);
      setCreatePrompt("");
      setCreateAnswer("");
      await loadDeck();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent" />
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/wizard"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wizard
        </Link>
        <p className="text-red-300">{error || "Deck not found."}</p>
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6"
      >
        <h1 className="text-2xl font-bold text-white mb-2">{deck.title}</h1>
        {deck.description && (
          <p className="text-white/60 text-sm mb-4">{deck.description}</p>
        )}
        <p className="text-white/50 text-sm mb-6">
          {cards.length} card{cards.length !== 1 ? "s" : ""}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { setShowCreateModal(true); setCreatePrompt(""); setCreateAnswer(""); }}
            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create card
          </button>
          <button
            onClick={() => { setShowImportModal(true); setImportDone(null); }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Import from flashcard
          </button>
          <button
            onClick={handleStartBattle}
            disabled={cards.length < 1}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Swords className="w-4 h-4" />
            Start battle
          </button>
        </div>
      </motion.div>

      <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <h2 className="text-lg font-semibold text-white px-6 py-4 border-b border-white/10">
          Cards
        </h2>
        {cards.length === 0 ? (
          <p className="text-white/50 px-6 py-8 text-center">
            No cards yet. Create a card or import from a flashcard deck above.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {cards.map((card) => {
              const prompt = card.isConcept ? (card.prompt ?? card.title) : getCardPromptAndAnswer(card).prompt;
              return (
                <li
                  key={card.cardId}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/5"
                >
                  <p className="text-white font-medium truncate flex-1 min-w-0" title={prompt}>
                    {prompt || "Untitled card"}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/dashboard/wizard/studio?deck=${wizardDeckId}&card=${encodeURIComponent(card.cardId)}`}
                      className="p-2 rounded-lg text-amber-400/80 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
                      title="Open in Studio"
                    >
                      <Sparkles className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleRemoveCard(card.cardId)}
                      disabled={removingCardId === card.cardId}
                      className="p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                      title="Remove from deck"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Create card modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Create card</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="p-1 text-white/50 hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Question (prompt)</label>
                <input
                  type="text"
                  value={createPrompt}
                  onChange={(e) => setCreatePrompt(e.target.value)}
                  placeholder="What is the question?"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Answer</label>
                <input
                  type="text"
                  value={createAnswer}
                  onChange={(e) => setCreateAnswer(e.target.value)}
                  placeholder="Correct answer (optional)"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCard}
                  disabled={creating || !createPrompt.trim()}
                  className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Import from flashcard deck modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {!importDeckId ? "Import from flashcard deck" : importStep === "map" ? "Map fields" : "Select cards to import"}
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportDeckId(null);
                  setImportDeckCards([]);
                  setSelectedCardIds(new Set());
                  setImportStep("cards");
                  setImportTitleBlockId("");
                  setImportDescriptionBlockId("");
                  setImportDone(null);
                }}
                className="p-1 text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importDeckId ? (
              <>
                <p className="text-white/60 text-sm mb-4">
                  Choose a flashcard deck, then select which cards to add to this Wizard deck.
                </p>
                {importDone !== null && (
                  <p className="text-green-400 text-sm mb-4">
                    Imported {importDone} card{importDone !== 1 ? "s" : ""}.
                  </p>
                )}
                <div className="overflow-y-auto flex-1 space-y-2">
                  {flashcardDecks.length === 0 && (
                    <p className="text-white/50 text-sm">No flashcard decks yet. Create one from the dashboard.</p>
                  )}
                  {flashcardDecks.map((d) => (
                    <button
                      key={d.deckId}
                      onClick={() => handleSelectDeck(d.deckId)}
                      className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                    >
                      {d.title}
                    </button>
                  ))}
                </div>
              </>
            ) : importStep === "map" ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setImportStep("cards")}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                    title="Back to cards"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white/60 text-sm truncate">
                    Map title and description for {selectedCardIds.size} card{selectedCardIds.size !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-white/60 text-sm mb-4">
                  Choose which block is <strong>title</strong> and which is <strong>description</strong>. These are stored on the Wizard deck so Studio can use them.
                </p>
                {(() => {
                  const firstCard = importDeckCards.find(
                    (c) => selectedCardIds.has(c.cardId) && (c.blocksSnapshot?.length > 0)
                  ) ?? importDeckCards.find((c) => selectedCardIds.has(c.cardId));
                  const blocks = firstCard?.blocksSnapshot ?? [];
                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Title (required)</label>
                        <select
                          value={importTitleBlockId}
                          onChange={(e) => setImportTitleBlockId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-accent/50"
                        >
                          <option value="">— Select block —</option>
                          {blocks.map((b) => {
                            const value = firstCard ? getBlockValueText(firstCard, b.blockId) : "";
                            const display = (value || b.label || b.type || "(empty)").slice(0, 80);
                            return (
                              <option key={b.blockId} value={b.blockId}>
                                {display}{value.length > 80 ? "…" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Description (optional)</label>
                        <select
                          value={importDescriptionBlockId}
                          onChange={(e) => setImportDescriptionBlockId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-accent/50"
                        >
                          <option value="">— Select block —</option>
                          {blocks.map((b) => {
                            const value = firstCard ? getBlockValueText(firstCard, b.blockId) : "";
                            const display = (value || b.label || b.type || "(empty)").slice(0, 80);
                            return (
                              <option key={b.blockId} value={b.blockId}>
                                {display}{value.length > 80 ? "…" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  );
                })()}
                <button
                  onClick={handleImportSelected}
                  disabled={importing || !importTitleBlockId}
                  className="mt-4 w-full py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors"
                >
                  {importing ? "Importing…" : `Import ${selectedCardIds.size} card${selectedCardIds.size !== 1 ? "s" : ""}`}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => { setImportDeckId(null); setImportDeckCards([]); setSelectedCardIds(new Set()); setImportStep("cards"); setImportDone(null); }}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                    title="Back to decks"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white/60 text-sm truncate">
                    {flashcardDecks.find((d) => d.deckId === importDeckId)?.title ?? "Deck"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={selectAllCards}
                    className="text-sm text-accent hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-white/30">|</span>
                  <button
                    onClick={deselectAllCards}
                    className="text-sm text-white/60 hover:underline"
                  >
                    Deselect all
                  </button>
                  <span className="text-white/50 text-sm ml-auto">
                    {selectedCardIds.size} of {importDeckCards.length} selected
                  </span>
                </div>
                {importDone !== null && (
                  <p className="text-green-400 text-sm mb-2">
                    Imported {importDone} card{importDone !== 1 ? "s" : ""}.
                  </p>
                )}
                <div className="overflow-y-auto flex-1 space-y-1 min-h-0">
                  {importDeckCards.length === 0 && (
                    <p className="text-white/50 text-sm py-4">No cards in this deck.</p>
                  )}
                  {importDeckCards.map((card) => {
                    const prompt = card.isConcept ? (card.prompt ?? card.title) : getCardPromptAndAnswer(card).prompt;
                    const isSelected = selectedCardIds.has(card.cardId);
                    return (
                      <button
                        key={card.cardId}
                        onClick={() => toggleCardSelection(card.cardId)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors flex items-center gap-3 ${
                          isSelected
                            ? "bg-accent/20 border-accent/50 text-white"
                            : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded border-2 border-current flex items-center justify-center">
                          {isSelected ? <Check className="w-3 h-3" /> : null}
                        </span>
                        <span className="truncate flex-1 min-w-0">{prompt || "Untitled card"}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setImportStep("map")}
                  disabled={selectedCardIds.size === 0}
                  className="mt-4 w-full py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors"
                >
                  Next: Map fields
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
