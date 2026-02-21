/**
 * Wizard Mode (TCG battle) helpers.
 * Aligned with DECKBASE_MVP_TECHNICAL_SPEC.md: rarity, ATK/DEF, momentum, XP.
 */

const BLOCK_TYPE_BY_ID = {
  0: "header1",
  1: "header2",
  2: "header3",
  3: "text",
  4: "quote",
  5: "hiddenText",
  6: "image",
  7: "audio",
  8: "quizMultiSelect",
  9: "quizSingleSelect",
  10: "quizTextAnswer",
};

function resolveBlockType(rawType) {
  if (rawType == null) return null;
  if (typeof rawType === "number") return BLOCK_TYPE_BY_ID[rawType] ?? null;
  if (typeof rawType === "string") {
    const n = Number(rawType);
    if (!Number.isNaN(n) && BLOCK_TYPE_BY_ID[n]) return BLOCK_TYPE_BY_ID[n];
    return rawType;
  }
  return null;
}

function safeJsonParse(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getQuizData(block, value) {
  const config = safeJsonParse(block?.configJson);
  const rawOptions = Array.isArray(config?.options)
    ? config.options
    : Array.isArray(value?.items)
    ? value.items
    : [];
  const options = rawOptions.map((o) => String(o));
  let correctAnswers = [];
  if (Array.isArray(config?.correctAnswers)) {
    correctAnswers = config.correctAnswers.map((a) => String(a));
  } else if (Array.isArray(config?.correctAnswerIndices)) {
    correctAnswers = config.correctAnswerIndices.map((i) => options[i]).filter(Boolean);
  } else if (typeof config?.correctAnswerIndex === "number" && options[config.correctAnswerIndex]) {
    correctAnswers = [options[config.correctAnswerIndex]];
  } else if (typeof config?.correctAnswer === "string") {
    correctAnswers = [config.correctAnswer];
  } else if (Array.isArray(value?.correctAnswers)) {
    correctAnswers = value.correctAnswers.map((a) => String(a));
  }
  return {
    question: config?.question || value?.text || block?.label || "Question",
    options,
    correctAnswers,
    caseSensitive: Boolean(config?.caseSensitive),
  };
}

/**
 * Get prompt and correct answer(s) for a card for Wizard battle.
 * Prefers quiz block; else main_block (prompt) + sub_block (answer); else first two text/header blocks.
 */
export function getCardPromptAndAnswer(card) {
  if (!card?.blocksSnapshot?.length) {
    return { prompt: "No question", correctAnswers: [], type: "text" };
  }
  const getValue = (blockId) => card.values?.find((v) => v.blockId === blockId);

  const quizBlock = card.blocksSnapshot.find((b) => {
    const t = resolveBlockType(b.type);
    return t === "quizSingleSelect" || t === "quizMultiSelect" || t === "quizTextAnswer";
  });
  if (quizBlock) {
    const value = getValue(quizBlock.blockId);
    const quiz = getQuizData(quizBlock, value);
    const type = resolveBlockType(quizBlock.type) === "quizTextAnswer" ? "text" : "mcq";
    return {
      prompt: quiz.question,
      correctAnswers: quiz.correctAnswers,
      options: type === "mcq" ? quiz.options : null,
      caseSensitive: quiz.caseSensitive,
      type,
    };
  }

  const textOrHeaderBlocks = card.blocksSnapshot.filter((b) => {
    const t = resolveBlockType(b.type);
    return ["header1", "header2", "header3", "text", "quote", "hiddenText"].includes(t);
  });
  const promptBlock = card.mainBlockId
    ? textOrHeaderBlocks.find((b) => b.blockId === card.mainBlockId)
    : textOrHeaderBlocks[0];
  const answerBlock = card.subBlockId
    ? textOrHeaderBlocks.find((b) => b.blockId === card.subBlockId)
    : textOrHeaderBlocks[1];
  const prompt = promptBlock ? getValue(promptBlock.blockId)?.text : null;
  const answer = answerBlock ? getValue(answerBlock.blockId)?.text : null;
  return {
    prompt: prompt || "What is it?",
    correctAnswers: answer ? [answer.trim()] : [],
    options: null,
    caseSensitive: false,
    type: "text",
  };
}

const RARITY_TIERS = ["common", "rare", "epic", "legendary"];
const RARITY_SCORE_BY_TIER = { common: 15, rare: 45, epic: 65, legendary: 90 };

/**
 * Derive rarity from card (no Concept yet). Uses reviewCount as proxy for "exposure".
 * reviewCount 0–2 → common, 3–10 → rare, 11–30 → epic, 31+ → legendary.
 */
export function deriveRarityFromCard(card) {
  const count = card?.reviewCount ?? 0;
  let tier;
  if (count <= 2) tier = "common";
  else if (count <= 10) tier = "rare";
  else if (count <= 30) tier = "epic";
  else tier = "legendary";
  return {
    rarity_tier: tier,
    rarity_score: RARITY_SCORE_BY_TIER[tier],
  };
}

/**
 * Approximate mastery percent from card SRS state and review count.
 */
export function getMasteryPercent(card) {
  if (!card) return 0;
  const count = card.reviewCount ?? 0;
  if (count === 0) return 0;
  const state = card.srsState ?? 1;
  if (state === 2) return Math.min(95, 50 + (card.srsStability ?? 1) * 2);
  if (state === 1) return Math.min(40, 10 + count * 3);
  return Math.min(95, 20 + count * 2);
}

const MOMENTUM_STATES = [
  { name: "Recovery", min: 0, max: 25, xpMultiplier: 0.8 },
  { name: "Stable", min: 26, max: 50, xpMultiplier: 1.0 },
  { name: "Empowered", min: 51, max: 75, xpMultiplier: 1.2 },
  { name: "Surge", min: 76, max: 100, xpMultiplier: 1.5 },
];

export function getMomentumState(momentumScore) {
  const s = Number(momentumScore) ?? 50;
  return MOMENTUM_STATES.find((st) => s >= st.min && s <= st.max) || MOMENTUM_STATES[1];
}

/**
 * Compute momentum_score (0–100) from progress.
 * Formula: StreakFactor + AccuracyFactor - FailurePenalty.
 */
export function computeMomentum(progress) {
  const streak = progress?.currentStreak ?? 0;
  const accuracy = progress?.rollingAccuracy ?? 100;
  const recent = progress?.recentAnswers ?? [];
  const failCount = recent.filter((a) => a === false).length;
  const recentFailRate = recent.length > 0 ? failCount / recent.length : 0;

  const streakFactor = Math.min(streak * 5, 40);
  const accuracyFactor = accuracy * 0.5;
  const failurePenalty = recentFailRate * 20;
  return Math.min(100, Math.max(0, streakFactor + accuracyFactor - failurePenalty));
}

const RARITY_XP = { common: 1.0, rare: 1.5, epic: 2.0, legendary: 3.0 };
const BASE_XP = 10;

/**
 * XP for one card: BaseXP × RarityMultiplier × MomentumMultiplier.
 * Optional: add atk for extra XP.
 */
export function computeXP(rarityTier, momentumScore, correct, atk = 0) {
  const mult = RARITY_XP[rarityTier] ?? 1;
  const state = getMomentumState(momentumScore);
  let xp = Math.round(BASE_XP * mult * state.xpMultiplier);
  if (correct && atk > 0) xp += atk;
  if (!correct) xp = Math.max(0, Math.round(xp * 0.2));
  return xp;
}

/**
 * ATK = round(10 + 0.4 × rarity_score + 0.2 × momentum_score)
 */
export function computeATK(rarityScore, momentumScore) {
  return Math.round(10 + 0.4 * (rarityScore ?? 50) + 0.2 * (momentumScore ?? 50));
}

/**
 * DEF = round(10 + 0.5 × rarity_score + 0.3 × (100 - mastery_percent))
 */
export function computeDEF(rarityScore, masteryPercent) {
  return Math.round(10 + 0.5 * (rarityScore ?? 50) + 0.3 * (100 - (masteryPercent ?? 0)));
}

/**
 * Build a battle of 5 CardInstances from deck cards and user progress.
 * Weight: lower mastery → higher chance; mix rarities; avoid recent.
 */
export function generateBattleCards(cards, progress, count = 5) {
  if (!cards?.length) return [];
  const momentumScore = progress?.momentumScore ?? 50;

  const withMeta = cards.map((card) => {
    const { rarity_tier, rarity_score } = deriveRarityFromCard(card);
    const mastery = getMasteryPercent(card);
    const atk = computeATK(rarity_score, momentumScore);
    const def = computeDEF(rarity_score, mastery);
    const { prompt, correctAnswers, options, type } = getCardPromptAndAnswer(card);
    return {
      card,
      rarity_tier,
      rarity_score,
      mastery,
      atk,
      def,
      prompt,
      correctAnswers,
      options,
      challengeType: type === "mcq" ? "mcq" : "text",
    };
  });

  withMeta.sort((a, b) => a.mastery - b.mastery);
  const reinforcement = withMeta[0];
  const rest = withMeta.slice(1);
  const shuffled = [...rest].sort(() => Math.random() - 0.5);
  const mid = shuffled.slice(0, 2);
  const high = shuffled.slice(2, 3);
  const wild = shuffled[3];
  const picked = [reinforcement, ...mid, ...high, wild].filter(Boolean).slice(0, count);
  return picked.map((p) => ({
    cardId: p.card.cardId,
    card: p.card,
    rarity_tier: p.rarity_tier,
    rarity_score: p.rarity_score,
    atk: p.atk,
    def: p.def,
    challengeType: p.challengeType,
    prompt: p.prompt,
    correctAnswers: p.correctAnswers,
    options: p.options,
    caseSensitive: p.caseSensitive,
  }));
}

/**
 * Update rolling_accuracy and recent_answers from a single answer.
 */
export function updateRollingFromAnswer(progress, correct) {
  const recent = [...(progress?.recentAnswers ?? [])];
  recent.push(correct);
  if (recent.length > 30) recent.shift();
  const correctCount = recent.filter(Boolean).length;
  const rollingAccuracy = recent.length > 0 ? (correctCount / recent.length) * 100 : 100;
  return { recentAnswers: recent, rollingAccuracy };
}

/**
 * Update streak from progress. lastActiveDate and currentStreak.
 * Today already recorded → no change. Yesterday → increment. Else → reset to 1.
 */
export function updateStreak(progress) {
  const today = new Date().toISOString().slice(0, 10);
  const last = progress?.lastActiveDate ?? null;
  const current = progress?.currentStreak ?? 0;
  if (!last) return { currentStreak: 1, lastActiveDate: today };
  const lastDate = new Date(last);
  const todayDate = new Date(today);
  const diffDays = Math.round((todayDate - lastDate) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return { currentStreak: current, lastActiveDate: today };
  if (diffDays === 1) return { currentStreak: current + 1, lastActiveDate: today };
  return { currentStreak: 1, lastActiveDate: today };
}

/**
 * Check if user answer is correct (for MCQ or text).
 */
export function checkAnswer(instance, userAnswer) {
  const correct = instance.correctAnswers || [];
  if (!correct.length) return false;
  if (instance.caseSensitive) {
    return correct.some((c) => String(c).trim() === String(userAnswer).trim());
  }
  const u = String(userAnswer).trim().toLowerCase();
  return correct.some((c) => String(c).trim().toLowerCase() === u);
}
