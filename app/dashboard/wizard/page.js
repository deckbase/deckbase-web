"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Swords, Zap, Shield, Sparkles, Download, X, Plus, ChevronRight, MoreVertical, Trash2, Check, ChevronLeft, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getWizardDecks,
  createWizardDeck,
  deleteWizardDeck,
  updateWizardDeck,
  getWizardDeckCards,
  getWizardDeckEntries,
  setWizardProgress,
  initWizardProgressIfNeeded,
  getDecks,
  getCards,
  addToWizardDeck,
  updateCardReview,
} from "@/utils/firestore";
import {
  generateBattleCards,
  computeXP,
  computeMomentum,
  updateRollingFromAnswer,
  updateStreak,
  getMomentumState,
  checkAnswer,
} from "@/utils/wizard";
import { WizardCardFace } from "@/components/WizardCardFace";

function getBlockValueText(card, blockId) {
  if (!card?.values || !blockId) return "";
  const v = card.values.find((x) => x.blockId === blockId);
  if (!v) return "";
  if (typeof v.text === "string") return v.text.trim();
  if (Array.isArray(v.items)) return v.items.map(String).join(" ").trim();
  return "";
}

const RARITY_COLORS = {
  common: "border-white/30 text-white/70",
  rare: "border-blue-400/50 text-blue-300",
  epic: "border-purple-400/50 text-purple-300",
  legendary: "border-amber-400/50 text-amber-300",
};

export default function WizardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const deckParam = searchParams.get("deck");

  const [wizardDecks, setWizardDecks] = useState([]);
  const [deckCounts, setDeckCounts] = useState({});
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [wizardCards, setWizardCards] = useState([]);
  const [phase, setPhase] = useState("entry");
  const [battleCards, setBattleCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [xpEarnedThisCard, setXpEarnedThisCard] = useState(0);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [decks, setDecks] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(null);
  const [targetWizardDeckId, setTargetWizardDeckId] = useState("");
  const [importStep, setImportStep] = useState("decks"); // 'decks' | 'cards' | 'map'
  const [importDeckId, setImportDeckId] = useState(null);
  const [importDeckCards, setImportDeckCards] = useState([]);
  const [selectedImportCardIds, setSelectedImportCardIds] = useState(new Set());
  const [importTitleBlockId, setImportTitleBlockId] = useState("");
  const [importDescriptionBlockId, setImportDescriptionBlockId] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  const [openMenuDeckId, setOpenMenuDeckId] = useState(null);
  const [deletingDeckId, setDeletingDeckId] = useState(null);
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(null);
  const [editDeckId, setEditDeckId] = useState(null);
  const [editDeckName, setEditDeckName] = useState("");
  const [savingDeckName, setSavingDeckName] = useState(false);
  const startedBattleForDeckRef = useRef(null);

  const currentInstance = battleCards[currentIndex];
  const totalCards = battleCards.length;
  const isLastCard = currentIndex >= totalCards - 1;

  const loadWizardWorld = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [deckList, prog] = await Promise.all([
        getWizardDecks(user.uid),
        initWizardProgressIfNeeded(user.uid),
      ]);
      setWizardDecks(deckList);
      setProgress(prog);
      const counts = {};
      for (const w of deckList) {
        const entries = await getWizardDeckEntries(user.uid, w.wizardDeckId);
        counts[w.wizardDeckId] = entries.length;
      }
      setDeckCounts(counts);
    } catch (e) {
      console.error(e);
      setError("Failed to load Wizard decks.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWizardWorld();
  }, [loadWizardWorld]);

  const loadDecksForImport = useCallback(async () => {
    if (!user) return;
    const list = await getDecks(user.uid);
    setDecks(list);
  }, [user]);

  useEffect(() => {
    if (showImportModal && user) loadDecksForImport();
  }, [showImportModal, user, loadDecksForImport]);

  const loadDeckCardsForImport = useCallback(
    async (deckId) => {
      if (!user || !deckId) return;
      const list = await getCards(user.uid, deckId);
      setImportDeckCards(list);
      setSelectedImportCardIds(new Set(list.map((c) => c.cardId)));
    },
    [user]
  );

  const handleSelectDeckForImport = (deckId) => {
    setImportDeckId(deckId);
    setImportDone(null);
    setImportStep("cards");
    loadDeckCardsForImport(deckId);
  };

  const toggleImportCardSelection = (cardId) => {
    setSelectedImportCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const selectAllImportCards = () => setSelectedImportCardIds(new Set(importDeckCards.map((c) => c.cardId)));
  const deselectAllImportCards = () => setSelectedImportCardIds(new Set());

  const handleSaveDeckName = async () => {
    if (!user || !editDeckId || savingDeckName) return;
    const name = editDeckName.trim();
    if (!name) return;
    setSavingDeckName(true);
    try {
      await updateWizardDeck(user.uid, editDeckId, { title: name });
      setWizardDecks((prev) =>
        prev.map((d) => (d.wizardDeckId === editDeckId ? { ...d, title: name } : d))
      );
      setEditDeckId(null);
      setEditDeckName("");
    } catch (e) {
      console.error(e);
      setError("Failed to update deck name.");
    } finally {
      setSavingDeckName(false);
    }
  };

  const handleImportSelected = async () => {
    if (!user || importing || selectedImportCardIds.size === 0 || !importTitleBlockId) return;
    setImporting(true);
    setImportDone(null);
    try {
      let wizDeckId = targetWizardDeckId;
      if (targetWizardDeckId === "__new__") {
        const newDeck = await createWizardDeck(user.uid, "Imported Deck", "imported");
        wizDeckId = newDeck.wizardDeckId;
      }
      const selectedCards = importDeckCards.filter((c) => selectedImportCardIds.has(c.cardId));
      for (const card of selectedCards) {
        const title = importTitleBlockId ? getBlockValueText(card, importTitleBlockId) : "";
        const description = importDescriptionBlockId ? getBlockValueText(card, importDescriptionBlockId) : "";
        await addToWizardDeck(user.uid, wizDeckId, card.cardId, importDeckId, "import", { title, description });
      }
      setImportDone(selectedCards.length);
      setImportStep("decks");
      setImportDeckId(null);
      setImportDeckCards([]);
      setSelectedImportCardIds(new Set());
      setImportTitleBlockId("");
      setImportDescriptionBlockId("");
      await loadWizardWorld();
    } catch (e) {
      console.error(e);
      setError("Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!user || creatingDeck) return;
    const name = newDeckName.trim();
    if (!name) return;
    setCreatingDeck(true);
    try {
      await createWizardDeck(user.uid, name, "created", newDeckDescription.trim());
      setShowCreateDeckModal(false);
      setNewDeckName("");
      setNewDeckDescription("");
      await loadWizardWorld();
    } catch (e) {
      console.error(e);
      setError("Failed to create deck.");
    } finally {
      setCreatingDeck(false);
    }
  };

  const openCreateDeckModal = () => {
    setNewDeckName("");
    setNewDeckDescription("");
    setShowCreateDeckModal(true);
  };

  const handleDeleteDeck = async (wizardDeckId, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user || deletingDeckId || !wizardDeckId) return;
    setOpenMenuDeckId(null);
    setDeletingDeckId(wizardDeckId);
    try {
      await deleteWizardDeck(user.uid, wizardDeckId);
      setConfirmDeleteDeck(null);
      await loadWizardWorld();
    } catch (err) {
      console.error(err);
      setError("Failed to delete deck.");
    } finally {
      setDeletingDeckId(null);
    }
  };

  const handleImportDeck = async (flashcardDeckId) => {
    if (!user || importing) return;
    setImporting(true);
    setImportDone(null);
    try {
      let wizDeckId = targetWizardDeckId;
      if (targetWizardDeckId === "__new__") {
        const newDeck = await createWizardDeck(user.uid, "Imported Deck", "imported");
        wizDeckId = newDeck.wizardDeckId;
      }
      const added = await addDeckToWizardDeck(user.uid, wizDeckId, flashcardDeckId);
      setImportDone(added);
      await loadWizardWorld();
    } catch (e) {
      console.error(e);
      setError("Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const startBattle = useCallback(async (wizardDeckId) => {
    if (!user || !progress || !wizardDeckId) return;
    const cards = await getWizardDeckCards(user.uid, wizardDeckId);
    if (cards.length < 1) return;
    setWizardCards(cards);
    setSelectedDeckId(wizardDeckId);
    const battle = generateBattleCards(cards, progress, 5);
    setBattleCards(battle);
    setCurrentIndex(0);
    setUserAnswer("");
    setAnswered(false);
    setTotalXPEarned(0);
    setCorrectCount(0);
    setPhase("battle");
  }, [user, progress]);

  // Start battle when navigated with ?deck=wizardDeckId (from deck detail "Start battle")
  useEffect(() => {
    if (!deckParam) {
      startedBattleForDeckRef.current = null;
      return;
    }
    if (!user || !progress || phase !== "entry" || loading) return;
    if (startedBattleForDeckRef.current === deckParam) return;
    startedBattleForDeckRef.current = deckParam;
    startBattle(deckParam);
  }, [user, progress, deckParam, loading, phase, startBattle]);

  const submitAnswer = useCallback(async () => {
    if (!currentInstance || !user || answered) return;
    const isCorrect = checkAnswer(currentInstance, userAnswer);
    setCorrect(isCorrect);
    setAnswered(true);
    setCorrectCount((prev) => prev + (isCorrect ? 1 : 0));

    let xp = computeXP(currentInstance.rarity_tier, progress?.momentumScore ?? 50, isCorrect, currentInstance.atk);
    if (isCorrect && currentInstance.challengeType === "text") {
      xp = Math.round(xp * 1.15);
    }
    setXpEarnedThisCard(xp);
    setTotalXPEarned((prev) => prev + xp);

    const nextProgress = { ...progress };
    const rolling = updateRollingFromAnswer(progress, isCorrect);
    nextProgress.recentAnswers = rolling.recentAnswers;
    nextProgress.rollingAccuracy = rolling.rollingAccuracy;
    const streakData = updateStreak(progress);
    nextProgress.currentStreak = streakData.currentStreak;
    nextProgress.lastActiveDate = streakData.lastActiveDate;
    if (!isCorrect) {
      nextProgress.currentStreak = Math.max(0, (progress?.currentStreak ?? 0) - 1);
    }
    nextProgress.xp = (progress?.xp ?? 0) + xp;
    nextProgress.momentumScore = computeMomentum(nextProgress);
    nextProgress.level = Math.floor((nextProgress.xp ?? 0) / 100) + 1;
    setProgress(nextProgress);
    await setWizardProgress(user.uid, nextProgress);

    if (!currentInstance.card?.isConcept) {
      await updateCardReview(user.uid, currentInstance.cardId, {
        srsState: currentInstance.card.srsState,
        srsStep: currentInstance.card.srsStep,
        srsStability: currentInstance.card.srsStability,
        srsDifficulty: currentInstance.card.srsDifficulty,
        srsDue: currentInstance.card.srsDue,
        srsLastReview: Date.now(),
        reviewCount: (currentInstance.card.reviewCount ?? 0) + 1,
      });
    }
  }, [currentInstance, user, progress, userAnswer, answered]);

  const goNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
      setUserAnswer("");
      setAnswered(false);
      setXpEarnedThisCard(0);
    } else {
      setPhase("result");
    }
  }, [currentIndex, totalCards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {phase === "entry" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Swords className="w-8 h-8 text-purple-300" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Wizard Mode</h1>
            <p className="text-white/60 mb-6">
              A separate world. Import from flashcard decks or create new Wizard decks. Battle to earn XP.
            </p>
            {error && (
              <p className="text-red-300 text-sm mb-4">{error}</p>
            )}
            {progress && (
              <div className="flex flex-wrap justify-center gap-4 text-sm text-white/50 mb-6">
                <span>Level {progress.level}</span>
                <span>{progress.xp} XP</span>
                <span>Streak: {progress.currentStreak} days</span>
                <span>{getMomentumState(progress.momentumScore).name}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <Link
                href="/dashboard/wizard/studio"
                className="px-6 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition-colors flex items-center justify-center gap-2 border border-amber-400/30"
              >
                <Sparkles className="w-5 h-5" />
                Card Generation Studio
              </Link>
              <button
                onClick={openCreateDeckModal}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create new deck
              </button>
              <button
                onClick={() => { setShowImportModal(true); setImportDone(null); setTargetWizardDeckId(wizardDecks[0]?.wizardDeckId ?? "__new__"); }}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Import from deck
              </button>
            </div>
          </div>

          {wizardDecks.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Your Wizard decks</h2>
              <ul className="space-y-3">
                {wizardDecks.map((wd) => (
                  <li
                    key={wd.wizardDeckId}
                    className="flex items-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                  >
                    <Link
                      href={`/dashboard/wizard/${wd.wizardDeckId}`}
                      className="flex flex-1 items-center justify-between gap-4 min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{wd.title}</p>
                        <p className="text-sm text-white/50">
                          {(deckCounts[wd.wizardDeckId] ?? 0)} card{(deckCounts[wd.wizardDeckId] ?? 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40 flex-shrink-0" />
                    </Link>
                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuDeckId(openMenuDeckId === wd.wizardDeckId ? null : wd.wizardDeckId); }}
                        className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Deck options"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {openMenuDeckId === wd.wizardDeckId && (
                        <>
                          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpenMenuDeckId(null)} />
                          <div className="absolute right-0 top-full mt-1 z-20 py-1 min-w-[140px] rounded-xl bg-zinc-800 border border-white/10 shadow-lg">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditDeckId(wd.wizardDeckId);
                                setEditDeckName(wd.title ?? "");
                                setOpenMenuDeckId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-white hover:bg-white/10 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit deck name
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteDeck({ wizardDeckId: wd.wizardDeckId, title: wd.title }); setOpenMenuDeckId(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-white/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {phase === "battle" && currentInstance && (
        <>
          <div className="flex items-center justify-between mb-4 text-sm text-white/50">
            <span>Card {currentIndex + 1} / {totalCards}</span>
            <span className={RARITY_COLORS[currentInstance.rarity_tier]}>
              {currentInstance.rarity_tier}
            </span>
          </div>

          <motion.div
            key={currentInstance.cardId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
          >
            <WizardCardFace
              name={currentInstance.prompt}
              type="Spell"
              archetype="Vocabulary"
              rarity={currentInstance.rarity_tier}
              atk={currentInstance.atk}
              def={currentInstance.def}
              challengeType={currentInstance.challengeType}
            />
            <div className="p-6 sm:p-8 pt-2">
            <p className="text-lg font-semibold text-white mb-6 sr-only" aria-hidden="true">{currentInstance.prompt}</p>

            {!answered ? (
              <>
                {currentInstance.challengeType === "mcq" && currentInstance.options?.length > 0 ? (
                  <div className="space-y-2">
                    {currentInstance.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setUserAnswer(opt)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                          userAnswer === opt
                            ? "border-accent bg-accent/10 text-white"
                            : "border-white/10 text-white/70 hover:border-white/30"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                    placeholder="Type your answer..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                  />
                )}
                <button
                  onClick={submitAnswer}
                  disabled={!userAnswer?.trim()}
                  className="mt-6 w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors"
                >
                  Submit
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <p className={correct ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                  {correct ? "Correct!" : "Incorrect."}
                  {currentInstance.correctAnswers?.[0] && !correct && (
                    <span className="block text-white/60 text-sm mt-1">
                      Correct: {currentInstance.correctAnswers[0]}
                    </span>
                  )}
                </p>
                <p className="text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> +{xpEarnedThisCard} XP
                </p>
                <button
                  onClick={goNext}
                  className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                >
                  {isLastCard ? "See results" : "Next card"}
                </button>
              </div>
            )}
            </div>
          </motion.div>
        </>
      )}

      {phase === "result" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Swords className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Battle complete</h2>
          <p className="text-white/60 mb-2">
            You earned <strong className="text-amber-300">{totalXPEarned} XP</strong>.
          </p>
          <p className="text-white/50 text-sm mb-6">
            {correctCount} / {totalCards} correct
          </p>
          {progress && (
            <div className="flex flex-wrap justify-center gap-4 text-sm text-white/50 mb-6">
              <span>Level {progress.level}</span>
              <span>Total {progress.xp} XP</span>
              <span>Streak: {progress.currentStreak} days</span>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => selectedDeckId && startBattle(selectedDeckId)}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold"
            >
              Battle again
            </button>
            <Link
              href="/dashboard/wizard"
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              Wizard home
            </Link>
          </div>
        </motion.div>
      )}

      {/* Import from deck modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {importStep === "map" ? "Map fields" : importStep === "cards" ? "Select cards to import" : "Import from flashcard deck"}
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStep("decks");
                  setImportDeckId(null);
                  setImportDeckCards([]);
                  setSelectedImportCardIds(new Set());
                  setImportTitleBlockId("");
                  setImportDescriptionBlockId("");
                  setImportDone(null);
                }}
                className="p-1 text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importStep === "decks" && (
              <>
                <p className="text-white/60 text-sm mb-4">
                  Choose a flashcard deck, then select which cards to add and map title/description.
                </p>
                <div className="mb-4">
                  <label className="block text-sm text-white/70 mb-1">Add to Wizard deck</label>
                  <select
                    value={targetWizardDeckId}
                    onChange={(e) => setTargetWizardDeckId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-accent/50"
                  >
                    {wizardDecks.map((wd) => (
                      <option key={wd.wizardDeckId} value={wd.wizardDeckId}>{wd.title}</option>
                    ))}
                    <option value="__new__">Create new Wizard deck</option>
                  </select>
                </div>
                {importDone !== null && (
                  <p className="text-green-400 text-sm mb-4">Imported {importDone} card{importDone !== 1 ? "s" : ""}.</p>
                )}
                <div className="overflow-y-auto flex-1 space-y-2">
                  {decks.length === 0 && !importing && (
                    <p className="text-white/50 text-sm">No flashcard decks yet. Create one from the dashboard.</p>
                  )}
                  {decks.map((d) => (
                    <button
                      key={d.deckId}
                      onClick={() => handleSelectDeckForImport(d.deckId)}
                      disabled={importing}
                      className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-50 transition-colors"
                    >
                      {d.title}
                    </button>
                  ))}
                </div>
              </>
            )}

            {importStep === "map" && (
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
                    Map title and description for {selectedImportCardIds.size} card{selectedImportCardIds.size !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-white/60 text-sm mb-4">
                  Choose which block is <strong>title</strong> and which is <strong>description</strong>. Stored on the Wizard deck for Studio.
                </p>
                {(() => {
                  const firstCard =
                    importDeckCards.find((c) => selectedImportCardIds.has(c.cardId) && (c.blocksSnapshot?.length > 0)) ??
                    importDeckCards.find((c) => selectedImportCardIds.has(c.cardId));
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
                  {importing ? "Importing…" : `Import ${selectedImportCardIds.size} card${selectedImportCardIds.size !== 1 ? "s" : ""}`}
                </button>
              </>
            )}

            {importStep === "cards" && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => {
                      setImportDeckId(null);
                      setImportDeckCards([]);
                      setSelectedImportCardIds(new Set());
                      setImportStep("decks");
                      setImportDone(null);
                    }}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                    title="Back to decks"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white/60 text-sm truncate">
                    {decks.find((d) => d.deckId === importDeckId)?.title ?? "Deck"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={selectAllImportCards} className="text-sm text-accent hover:underline">
                    Select all
                  </button>
                  <span className="text-white/30">|</span>
                  <button onClick={deselectAllImportCards} className="text-sm text-white/60 hover:underline">
                    Deselect all
                  </button>
                  <span className="text-white/50 text-sm ml-auto">
                    {selectedImportCardIds.size} of {importDeckCards.length} selected
                  </span>
                </div>
                <div className="overflow-y-auto flex-1 space-y-1 min-h-0">
                  {importDeckCards.length === 0 && (
                    <p className="text-white/50 text-sm py-4">No cards in this deck.</p>
                  )}
                  {importDeckCards.map((card) => {
                    const label = card.values?.[0]?.text ?? card.blocksSnapshot?.[0]?.label ?? "Card";
                    const isSelected = selectedImportCardIds.has(card.cardId);
                    return (
                      <button
                        key={card.cardId}
                        onClick={() => toggleImportCardSelection(card.cardId)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors flex items-center gap-3 ${
                          isSelected
                            ? "bg-accent/20 border-accent/50 text-white"
                            : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded border-2 border-current flex items-center justify-center">
                          {isSelected ? <Check className="w-3 h-3" /> : null}
                        </span>
                        <span className="truncate flex-1 min-w-0">{label || "Untitled card"}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setImportStep("map")}
                  disabled={selectedImportCardIds.size === 0}
                  className="mt-4 w-full py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors"
                >
                  Next: Map fields
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Create new deck modal */}
      {showCreateDeckModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Create new Wizard deck</h3>
              <button
                onClick={() => setShowCreateDeckModal(false)}
                className="p-1 text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Name</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Deck name"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Description (optional)</label>
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Brief description"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateDeckModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDeck}
                  disabled={creatingDeck || !newDeckName.trim()}
                  className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors"
                >
                  {creatingDeck ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit deck name modal */}
      {editDeckId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit deck name</h3>
              <button
                onClick={() => { setEditDeckId(null); setEditDeckName(""); }}
                disabled={savingDeckName}
                className="p-1 text-white/50 hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={editDeckName}
              onChange={(e) => setEditDeckName(e.target.value)}
              placeholder="Deck name"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent/50 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEditDeckId(null); setEditDeckName(""); }}
                disabled={savingDeckName}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeckName}
                disabled={savingDeckName || !editDeckName.trim()}
                className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors"
              >
                {savingDeckName ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete deck confirmation modal */}
      {confirmDeleteDeck && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Delete deck?</h3>
              <button
                onClick={() => setConfirmDeleteDeck(null)}
                disabled={deletingDeckId === confirmDeleteDeck.wizardDeckId}
                className="p-1 text-white/50 hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/80 mb-6">
              &ldquo;{confirmDeleteDeck.title}&rdquo; will be permanently removed. Cards in this Wizard deck will be deleted; your flashcard decks are unchanged.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteDeck(null)}
                disabled={deletingDeckId === confirmDeleteDeck.wizardDeckId}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDeck(confirmDeleteDeck.wizardDeckId)}
                disabled={deletingDeckId === confirmDeleteDeck.wizardDeckId}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50 transition-colors"
              >
                {deletingDeckId === confirmDeleteDeck.wizardDeckId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
