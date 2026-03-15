/**
 * Parse AI JSON into card values + blocksSnapshot (quiz config lives on blocks).
 * Used by generate-with-ai, mobile add-with-ai, file-to-ai.
 */

const TEXT_LIKE = new Set([
  "header1",
  "header2",
  "header3",
  "text",
  "quote",
  "example",
  "hiddenText",
]);

function parseConfigJson(configJson) {
  if (configJson == null || configJson === "") return {};
  if (typeof configJson === "string") {
    try {
      const o = JSON.parse(configJson);
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }
  if (typeof configJson === "object") return { ...configJson };
  return {};
}

/**
 * Coerce AI output for a quiz block (object or JSON string).
 */
export function coerceQuizAiRaw(raw) {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      const o = JSON.parse(t);
      return o && typeof o === "object" ? o : null;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeOptions(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/** Fisher–Yates shuffle; returns new array. */
function shuffleArray(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build quiz block configJson string from AI payload + optional existing (hint, caseSensitive).
 */
export function mergeQuizConfigFromAi(blockType, existingConfigJson, raw) {
  const existing = parseConfigJson(existingConfigJson);
  const o = coerceQuizAiRaw(raw) || {};

  if (blockType === "quizSingleSelect" || blockType === 9) {
    let options = normalizeOptions(o.options);
    if (options.length < 2) {
      options = [
        ...(options.length ? options : []),
        "Option A",
        "Option B",
        "Option C",
        "Option D",
      ].slice(0, Math.max(4, options.length || 4));
    }
    while (options.length < 2) options.push(`Option ${options.length + 1}`);
    let correctAnswerIndex = -1;
    if (typeof o.correctIndex === "number" && o.correctIndex >= 0 && o.correctIndex < options.length) {
      correctAnswerIndex = o.correctIndex;
    } else if (o.correctAnswer != null && String(o.correctAnswer).trim()) {
      const want = String(o.correctAnswer).trim();
      const idx = options.findIndex((x) => x === want);
      correctAnswerIndex = idx >= 0 ? idx : 0;
    } else {
      correctAnswerIndex = 0;
    }
    const correct = options[correctAnswerIndex] ?? options[0];
    options = shuffleArray(options);
    correctAnswerIndex = options.findIndex((x) => x === correct);
    if (correctAnswerIndex < 0) correctAnswerIndex = 0;
    return JSON.stringify({
      question: String(o.question ?? "").trim() || "Question",
      options,
      correctAnswerIndex,
      correctAnswers: correct ? [correct] : [],
    });
  }

  if (blockType === "quizMultiSelect" || blockType === 8) {
    let options = normalizeOptions(o.options);
    if (options.length < 2) {
      options = ["Option A", "Option B", "Option C"].slice(0, 4);
    }
    let correctAnswerIndices = [];
    let correctAnswers = [];
    if (Array.isArray(o.correctIndices) && o.correctIndices.length) {
      correctAnswerIndices = o.correctIndices
        .map((i) => Number(i))
        .filter((i) => Number.isInteger(i) && i >= 0 && i < options.length);
    }
    if (!correctAnswerIndices.length && Array.isArray(o.correctAnswers)) {
      const seen = new Set();
      for (const ans of o.correctAnswers) {
        const want = String(ans ?? "").trim();
        const idx = options.findIndex((x) => x === want);
        if (idx >= 0 && !seen.has(idx)) {
          seen.add(idx);
          correctAnswerIndices.push(idx);
        }
      }
    }
    if (!correctAnswerIndices.length) correctAnswerIndices = [0];
    correctAnswers = correctAnswerIndices.map((i) => options[i]).filter(Boolean);
    options = shuffleArray(options);
    correctAnswerIndices = correctAnswers
      .map((ans) => options.indexOf(ans))
      .filter((idx) => idx >= 0)
      .sort((a, b) => a - b);
    if (!correctAnswerIndices.length && options.length) correctAnswerIndices = [0];
    return JSON.stringify({
      question: String(o.question ?? "").trim() || "Question",
      options,
      correctAnswerIndices,
      correctAnswers,
    });
  }

  if (blockType === "quizTextAnswer" || blockType === 10) {
    return JSON.stringify({
      question: String(o.question ?? "").trim() || "Question",
      correctAnswer: String(o.correctAnswer ?? "").trim() || "Answer",
      hint: o.hint != null ? String(o.hint) : existing.hint || "",
      caseSensitive: Boolean(existing.caseSensitive ?? o.caseSensitive ?? false),
    });
  }

  return typeof existingConfigJson === "string"
    ? existingConfigJson
    : JSON.stringify(existing);
}

export function isQuizBlockType(type) {
  return (
    type === "quizSingleSelect" ||
    type === "quizMultiSelect" ||
    type === "quizTextAnswer" ||
    type === 8 ||
    type === 9 ||
    type === 10
  );
}

/**
 * @param {object} parsed - One card object from AI (keys = blockIds)
 * @param {Array<{blockId,type,label,required?,configJson?}>} templateBlocksFull
 * @param {(t: *) => string} normalizeBlockTypeFn
 * @returns {{ values: object[], blocksSnapshot: object[] }}
 */
export function parseGeneratedCard(parsed, templateBlocksFull, normalizeBlockTypeFn) {
  const blocksSnapshot = templateBlocksFull.map((b) => ({
    blockId: b.blockId,
    type: b.type,
    label: b.label || "",
    required: Boolean(b.required),
    configJson:
      b.configJson !== undefined && b.configJson !== null
        ? typeof b.configJson === "string"
          ? b.configJson
          : JSON.stringify(b.configJson)
        : undefined,
  }));

  const values = [];
  const byId = (id) => blocksSnapshot.find((x) => x.blockId === id);

  for (let i = 0; i < templateBlocksFull.length; i++) {
    const block = templateBlocksFull[i];
    const type = normalizeBlockTypeFn(block.type);
    const raw = parsed[block.blockId];

    if (TEXT_LIKE.has(type) || type === 4 || type === "4") {
      values.push({
        blockId: block.blockId,
        type,
        text: raw != null ? String(raw).trim() : "",
      });
    } else if (type === "audio" || type === 7) {
      values.push({
        blockId: block.blockId,
        type: "audio",
        text: raw != null ? String(raw).trim() : "",
        mediaIds: [],
      });
    } else if (isQuizBlockType(type)) {
      const snap = byId(block.blockId);
      if (snap) {
        snap.configJson = mergeQuizConfigFromAi(type, block.configJson, raw);
      }
      values.push({
        blockId: block.blockId,
        type:
          type === 8
            ? "quizMultiSelect"
            : type === 9
              ? "quizSingleSelect"
              : type === 10
                ? "quizTextAnswer"
                : type,
        text: "",
      });
    } else if (type === "image" || type === 6) {
      values.push({
        blockId: block.blockId,
        type: "image",
        text: "",
        mediaIds: [],
      });
    } else if (type === "divider" || type === 11 || type === "space" || type === 12) {
      values.push({ blockId: block.blockId, type: block.type, text: "" });
    }
  }

  return { values, blocksSnapshot };
}

export function generatedCardHasContent(values, blocksSnapshot, normalizeBlockTypeFn) {
  for (const v of values || []) {
    if (v.text != null && String(v.text).trim()) return true;
  }
  for (const b of blocksSnapshot || []) {
    const t = normalizeBlockTypeFn(b.type);
    if (!isQuizBlockType(t)) continue;
    const cfg = parseConfigJson(b.configJson);
    if (cfg.question != null && String(cfg.question).trim()) return true;
  }
  return false;
}
