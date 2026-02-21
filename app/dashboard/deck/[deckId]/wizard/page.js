"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Swords, Zap, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDeck, getCards, updateCardReview, getWizardProgress, setWizardProgress, initWizardProgressIfNeeded } from "@/utils/firestore";
import {
  generateBattleCards,
  computeXP,
  computeMomentum,
  updateRollingFromAnswer,
  updateStreak,
  getMomentumState,
  checkAnswer,
} from "@/utils/wizard";

const RARITY_COLORS = {
  common: "border-white/30 text-white/70",
  rare: "border-blue-400/50 text-blue-300",
  epic: "border-purple-400/50 text-purple-300",
  legendary: "border-amber-400/50 text-amber-300",
};

export default function WizardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const deckId = params.deckId;

  const [deck, setDeck] = useState(null);
  const [phase, setPhase] = useState("entry"); // entry | battle | result
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

  const currentInstance = battleCards[currentIndex];
  const totalCards = battleCards.length;
  const isLastCard = currentIndex >= totalCards - 1;

  const loadDeckAndCards = useCallback(async () => {
    if (!user || !deckId) return;
    setLoading(true);
    setError("");
    try {
      const [deckData, cards] = await Promise.all([
        getDeck(user.uid, deckId),
        getCards(user.uid, deckId),
      ]);
      if (!deckData || deckData.isDeleted) {
        router.push("/dashboard");
        return;
      }
      setDeck(deckData);
      if (cards.length < 1) {
        setError("Add at least one card to this deck to start a Wizard battle.");
        setLoading(false);
        return;
      }
      const prog = await initWizardProgressIfNeeded(user.uid);
      setProgress(prog);
    } catch (e) {
      console.error(e);
      setError("Failed to load deck.");
    } finally {
      setLoading(false);
    }
  }, [user, deckId, router]);

  useEffect(() => {
    loadDeckAndCards();
  }, [loadDeckAndCards]);

  const startBattle = useCallback(async () => {
    if (!user || !deckId || !deck || !progress) return;
    const cards = await getCards(user.uid, deckId);
    if (cards.length < 1) return;
    const battle = generateBattleCards(cards, progress, 5);
    setBattleCards(battle);
    setCurrentIndex(0);
    setUserAnswer("");
    setAnswered(false);
    setTotalXPEarned(0);
    setCorrectCount(0);
    setPhase("battle");
  }, [user, deckId, deck, progress]);

  const submitAnswer = useCallback(async () => {
    if (!currentInstance || !user || answered) return;
    const isCorrect = checkAnswer(currentInstance, userAnswer);
    setCorrect(isCorrect);
    setAnswered(true);
    setCorrectCount((prev) => prev + (isCorrect ? 1 : 0));

    const xp = computeXP(currentInstance.rarity_tier, progress?.momentumScore ?? 50, isCorrect, currentInstance.atk);
    setXpEarnedThisCard(xp);
    setTotalXPEarned((prev) => prev + xp);

    const nextProgress = { ...progress };
    const rolling = updateRollingFromAnswer(progress, isCorrect);
    nextProgress.recentAnswers = rolling.recentAnswers;
    nextProgress.rollingAccuracy = rolling.rollingAccuracy;
    const streakData = updateStreak(progress);
    nextProgress.currentStreak = streakData.currentStreak;
    nextProgress.lastActiveDate = streakData.lastActiveDate;
    nextProgress.xp = (progress?.xp ?? 0) + xp;
    nextProgress.momentumScore = computeMomentum(nextProgress);
    nextProgress.level = Math.floor((nextProgress.xp ?? 0) / 100) + 1;
    setProgress(nextProgress);
    await setWizardProgress(user.uid, nextProgress);

    await updateCardReview(user.uid, currentInstance.cardId, {
      srsState: currentInstance.card.srsState,
      srsStep: currentInstance.card.srsStep,
      srsStability: currentInstance.card.srsStability,
      srsDifficulty: currentInstance.card.srsDifficulty,
      srsDue: currentInstance.card.srsDue,
      srsLastReview: Date.now(),
      reviewCount: (currentInstance.card.reviewCount ?? 0) + 1,
    });
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

  if (!deck) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/dashboard/deck/${deckId}`}
        className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to deck
      </Link>

      {phase === "entry" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Swords className="w-8 h-8 text-purple-300" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Wizard Mode</h1>
          <p className="text-white/60 mb-6">
            Battle 5 cards from <strong className="text-white/80">{deck.title}</strong>. Earn XP and build your streak.
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
          <button
            onClick={startBattle}
            disabled={!!error}
            className="px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold disabled:opacity-50 transition-colors"
          >
            Start battle
          </button>
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
          <div className="flex gap-4 mb-4">
            <span className="flex items-center gap-1 text-amber-400/80">
              <Zap className="w-4 h-4" /> ATK {currentInstance.atk}
            </span>
            <span className="flex items-center gap-1 text-blue-400/80">
              <Shield className="w-4 h-4" /> DEF {currentInstance.def}
            </span>
          </div>

          <motion.div
            key={currentInstance.cardId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8"
          >
            <p className="text-lg font-semibold text-white mb-6">{currentInstance.prompt}</p>

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
              onClick={startBattle}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold"
            >
              Battle again
            </button>
            <Link
              href={`/dashboard/deck/${deckId}`}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              Back to deck
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
