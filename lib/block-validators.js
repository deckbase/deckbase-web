/**
 * Block validators: every block type has a validator extending BaseBlockValidator.
 *
 * BLOCK COVERAGE (Firestore BlockType 0–12 + UI "example"):
 * ┌─────────────────────┬──────────────────────┬─────────────────────────────────────────────┐
 * │ Type (name)         │ Validator class      │ Validation rules                             │
 * ├─────────────────────┼──────────────────────┼─────────────────────────────────────────────┤
 * │ header1             │ TextBlockValidator   │ empty → "required" or "add content"; user can remove optional │
 * │ header2             │ TextBlockValidator   │ same (Quote, Text, Header 2/3 all show when empty)          │
 * │ header3             │ TextBlockValidator   │ same as above                               │
 * │ text                │ TextBlockValidator   │ same as above                               │
 * │ quote (Firestore 4) │ TextBlockValidator   │ same as above                               │
 * │ example (UI alias)  │ TextBlockValidator   │ same as above                               │
 * │ hiddenText          │ TextBlockValidator   │ same as above                               │
 * │ image               │ ImageBlockValidator  │ required → mediaIds.length > 0              │
 * │ audio               │ AudioBlockValidator  │ required → mediaIds.length > 0              │
 * │ quizSingleSelect    │ QuizSingleSelect     │ question + ≥2 options + correct answer       │
 * │ quizMultiSelect     │ QuizMultiSelect      │ question + ≥2 options + ≥1 correct         │
 * │ quizTextAnswer      │ QuizTextAnswer       │ question + correctAnswer text                │
 * │ divider             │ LayoutBlockValidator │ always valid, no content                    │
 * │ space               │ LayoutBlockValidator │ always valid, no content                    │
 * └─────────────────────┴──────────────────────┴─────────────────────────────────────────────┘
 */

/**
 * Abstract base class for block validation.
 * Subclasses must implement validate(block, value) and getErrorMessages(block, value).
 */
export class BaseBlockValidator {
  /**
   * Whether this block is valid. Subclasses must implement.
   * @param {Object} block - Block definition { blockId, type, label, required, configJson, ... }
   * @param {Object} [value] - Block value { text, mediaIds, ... }
   * @returns {boolean}
   */
  validate(block, value) {
    throw new Error("Subclass must implement validate(block, value)");
  }

  /**
   * Error messages when block is invalid. Subclasses must implement.
   * @param {Object} block - Block definition
   * @param {Object} [value] - Block value
   * @returns {string[]} - List of error messages (empty if valid)
   */
  getErrorMessages(block, value) {
    throw new Error("Subclass must implement getErrorMessages(block, value)");
  }

  /**
   * Whether this block has user content (for "at least one block has content" rule). Optional override.
   * @param {Object} block - Block definition
   * @param {Object} [value] - Block value
   * @returns {boolean}
   */
  hasContent(block, value) {
    return false;
  }
}

const label = (block) => block?.label || "Block";

/** Human-readable names for each block type (for validation messages). */
export const BLOCK_TYPE_LABELS = {
  header1: "Header 1",
  header2: "Header 2",
  header3: "Header 3",
  text: "Text",
  quote: "Example/Quote",
  example: "Example",
  hiddenText: "Hidden Text",
  image: "Image",
  audio: "Audio",
  quizSingleSelect: "Quiz (Single choice)",
  quizMultiSelect: "Quiz (Multi choice)",
  quizTextAnswer: "Quiz (Text answer)",
  divider: "Divider",
  space: "Space",
};

const typeLabel = (blockType) => BLOCK_TYPE_LABELS[blockType] || blockType || "Block";

/** Shared: format block error so we don't duplicate when block label equals type label (e.g. "Header 1: required" not "Header 1 (Header 1): required"). */
function formatBlockError(block, blockType, suffix) {
  const lb = label(block);
  const tl = typeLabel(blockType);
  if (lb === tl || !tl) return `${lb}: ${suffix}`;
  return `${lb} (${tl}): ${suffix}`;
}

/** Text blocks: header1, header2, header3, text, example, quote, hiddenText — all use same BaseBlockValidator impl.
 * All empty text blocks show a message (required → "required", optional → "add content"). User can remove optional blocks if not needed.
 */
export class TextBlockValidator extends BaseBlockValidator {
  validate(block, value) {
    const text = value?.text;
    return text != null && String(text).trim().length > 0;
  }

  getErrorMessages(block, value, blockType) {
    const text = value?.text;
    if (!text || !String(text).trim()) {
      return [formatBlockError(block, blockType, block.required ? "required" : "add content")];
    }
    return [];
  }

  hasContent(block, value) {
    const text = value?.text;
    return text != null && String(text).trim().length > 0;
  }
}

/** Image block */
export class ImageBlockValidator extends BaseBlockValidator {
  validate(block, value) {
    if (!block.required) return true;
    const ids = value?.mediaIds;
    return Array.isArray(ids) && ids.length > 0;
  }

  getErrorMessages(block, value, blockType) {
    if (!block.required) return [];
    const ids = value?.mediaIds;
    if (!Array.isArray(ids) || ids.length === 0) {
      return [formatBlockError(block, blockType, "add at least one image")];
    }
    return [];
  }

  hasContent(block, value) {
    const ids = value?.mediaIds;
    return Array.isArray(ids) && ids.length > 0;
  }
}

/** Audio block */
export class AudioBlockValidator extends BaseBlockValidator {
  validate(block, value) {
    if (!block.required) return true;
    const ids = value?.mediaIds;
    return Array.isArray(ids) && ids.length > 0;
  }

  getErrorMessages(block, value, blockType) {
    if (!block.required) return [];
    const ids = value?.mediaIds;
    if (!Array.isArray(ids) || ids.length === 0) {
      return [formatBlockError(block, blockType, "add at least one audio")];
    }
    return [];
  }

  hasContent(block, value) {
    const ids = value?.mediaIds;
    return Array.isArray(ids) && ids.length > 0;
  }
}

/**
 * Quiz block validator base; requires getBlockConfig(block) to parse configJson.
 */
function createQuizValidators(getBlockConfig) {
  class QuizSingleSelectValidator extends BaseBlockValidator {
    _hasValidCorrectAnswer(config, opts) {
      const correctIndex = config.correctAnswerIndex;
      if (typeof correctIndex === "number" && correctIndex >= 0 && correctIndex < opts.length) return true;
      const correctAnswers = config.correctAnswers;
      if (Array.isArray(correctAnswers) && correctAnswers.length === 1) {
        const want = String(correctAnswers[0]).trim();
        if (want && opts.some((o) => String(o).trim() === want)) return true;
      }
      return false;
    }

    validate(block, value) {
      const config = getBlockConfig(block);
      if (!config?.question || !String(config.question).trim()) return false;
      const options = config.options;
      const opts = Array.isArray(options) ? options.filter((o) => o != null && String(o).trim()) : [];
      if (opts.length < 2) return false;
      return this._hasValidCorrectAnswer(config, opts);
    }

    getErrorMessages(block, value, blockType) {
      const config = getBlockConfig(block);
      const errs = [];
      if (!config?.question || !String(config.question).trim()) {
        errs.push(formatBlockError(block, blockType, "question is required"));
        return errs;
      }
      const options = config.options;
      const opts = Array.isArray(options) ? options.filter((o) => o != null && String(o).trim()) : [];
      if (opts.length < 2) {
        errs.push(formatBlockError(block, blockType, "add at least 2 options"));
        return errs;
      }
      if (!this._hasValidCorrectAnswer(config, opts)) {
        errs.push(formatBlockError(block, blockType, "select the correct answer"));
      }
      return errs;
    }

    hasContent() {
      return true;
    }
  }

  class QuizMultiSelectValidator extends BaseBlockValidator {
    validate(block, value) {
      const config = getBlockConfig(block);
      if (!config?.question || !String(config.question).trim()) return false;
      const options = config.options;
      const opts = Array.isArray(options) ? options.filter((o) => o != null && String(o).trim()) : [];
      if (opts.length < 2) return false;
      const correctIndices = config.correctAnswerIndices;
      const correctAnswers = config.correctAnswers;
      return (Array.isArray(correctIndices) && correctIndices.length > 0) ||
        (Array.isArray(correctAnswers) && correctAnswers.length > 0);
    }

    getErrorMessages(block, value, blockType) {
      const config = getBlockConfig(block);
      const errs = [];
      if (!config?.question || !String(config.question).trim()) {
        errs.push(formatBlockError(block, blockType, "question is required"));
        return errs;
      }
      const options = config.options;
      const opts = Array.isArray(options) ? options.filter((o) => o != null && String(o).trim()) : [];
      if (opts.length < 2) {
        errs.push(formatBlockError(block, blockType, "add at least 2 options"));
        return errs;
      }
      const correctIndices = config.correctAnswerIndices;
      const correctAnswers = config.correctAnswers;
      const hasCorrect = (Array.isArray(correctIndices) && correctIndices.length > 0) ||
        (Array.isArray(correctAnswers) && correctAnswers.length > 0);
      if (!hasCorrect) {
        errs.push(formatBlockError(block, blockType, "select at least one correct answer"));
      }
      return errs;
    }

    hasContent() {
      return true;
    }
  }

  class QuizTextAnswerValidator extends BaseBlockValidator {
    validate(block, value) {
      const config = getBlockConfig(block);
      if (!config?.question || !String(config.question).trim()) return false;
      const correct = config.correctAnswer;
      return correct != null && String(correct).trim().length > 0;
    }

    getErrorMessages(block, value, blockType) {
      const config = getBlockConfig(block);
      const errs = [];
      if (!config?.question || !String(config.question).trim()) {
        errs.push(formatBlockError(block, blockType, "question is required"));
        return errs;
      }
      const correct = config.correctAnswer;
      if (correct == null || !String(correct).trim()) {
        errs.push(formatBlockError(block, blockType, "correct answer is required"));
      }
      return errs;
    }

    hasContent() {
      return true;
    }
  }

  return { QuizSingleSelectValidator, QuizMultiSelectValidator, QuizTextAnswerValidator };
}

/** Layout blocks (divider, space): no value validation, always valid */
export class LayoutBlockValidator extends BaseBlockValidator {
  validate() {
    return true;
  }

  getErrorMessages(block, value, blockType) {
    return [];
  }
}

/** Single source of truth: every block type that must have a validator (Firestore 0–12 + UI "example"). */
const REGISTRY_ENTRIES = [
  ["header1", "text"],
  ["header2", "text"],
  ["header3", "text"],
  ["text", "text"],
  ["quote", "text"],
  ["example", "text"],
  ["hiddenText", "text"],
  ["image", "image"],
  ["audio", "audio"],
  ["quizSingleSelect", "quizSingle"],
  ["quizMultiSelect", "quizMulti"],
  ["quizTextAnswer", "quizText"],
  ["divider", "layout"],
  ["space", "layout"],
];

export const ALL_BLOCK_TYPES = REGISTRY_ENTRIES.map(([type]) => type);

/**
 * Build the validator registry: map each block type string → validator instance (all extend BaseBlockValidator).
 */
export function createValidatorRegistry(getBlockConfig) {
  const textValidator = new TextBlockValidator();
  const imageValidator = new ImageBlockValidator();
  const audioValidator = new AudioBlockValidator();
  const layoutValidator = new LayoutBlockValidator();
  const { QuizSingleSelectValidator, QuizMultiSelectValidator, QuizTextAnswerValidator } =
    createQuizValidators(getBlockConfig);

  const registry = new Map();
  for (const [blockType, kind] of REGISTRY_ENTRIES) {
    const validator =
      kind === "text"
        ? textValidator
        : kind === "image"
          ? imageValidator
          : kind === "audio"
            ? audioValidator
            : kind === "layout"
              ? layoutValidator
              : kind === "quizSingle"
                ? new QuizSingleSelectValidator()
                : kind === "quizMulti"
                  ? new QuizMultiSelectValidator()
                  : kind === "quizText"
                    ? new QuizTextAnswerValidator()
                    : null;
    if (!validator) throw new Error(`Unknown validator kind: ${kind}`);
    registry.set(blockType, validator);
  }

  for (const type of ALL_BLOCK_TYPES) {
    if (!registry.has(type)) {
      throw new Error(`Block validator missing for type: ${type}`);
    }
  }
  return registry;
}

/** Default for unknown block types: always valid, no content. */
const defaultValidator = new LayoutBlockValidator();

// Set to true or use window.__DEBUG_CARD_VALIDATION__ = true in console to see validation logs (use console.log so they're visible)
const DEBUG_VALIDATION =
  (typeof process !== "undefined" && process.env?.NODE_ENV === "development") ||
  (typeof window !== "undefined" && window.__DEBUG_CARD_VALIDATION__);

function debugLog(...args) {
  if (DEBUG_VALIDATION) console.log("[VALIDATION]", ...args);
}

/**
 * Run validation on all blocks and return { valid, errors, errorsByBlockId }.
 * resolveBlockType(block) should return the string type (e.g. "header1", "quizSingleSelect").
 * errorsByBlockId[blockId] = string[] so UI can show inline errors per block.
 */
export function getBlockValidationErrors(blocksList, valuesObj, { resolveBlockType, getBlockConfig }) {
  const errs = [];
  const errorsByBlockId = {};
  let hasAnyContent = false;
  const registry = createValidatorRegistry(getBlockConfig);

  const blocksSummary = (blocksList || []).map((b) => ({
    blockId: b.blockId,
    rawType: b.type,
    rawTypeOf: typeof b.type,
    label: b.label,
    required: b.required,
  }));
  debugLog("getBlockValidationErrors START", {
    blocksCount: blocksList?.length ?? 0,
    valueKeys: valuesObj ? Object.keys(valuesObj) : [],
    blocksSummary,
    registryTypes: Array.from(registry.keys()),
  });

  for (const block of blocksList || []) {
    const blockType = resolveBlockType(block);
    const value = valuesObj?.[block.blockId];
    const validator = registry.get(blockType) ?? defaultValidator;
    const usedDefault = !registry.has(blockType);
    if (usedDefault) {
      const warnMsg = `[VALIDATION] Unknown block type — no validator for block "${block.label}" (blockId: ${block.blockId}, rawType: ${block.type}, resolvedType: ${blockType}). Using default (always valid).`;
      console.warn(warnMsg);
      debugLog("VALIDATION WARNING: unknown block type", {
        blockId: block.blockId,
        label: block.label,
        rawType: block.type,
        resolvedType: blockType,
      });
    }
    const valid = validator.validate(block, value);
    const blockErrs = valid ? [] : validator.getErrorMessages(block, value, blockType);
    const content = validator.hasContent(block, value);

    debugLog(`block ${block.blockId} (${block.label})`, {
      rawType: block.type,
      resolvedType: blockType,
      validatorFound: !usedDefault,
      hasValue: value != null,
      valueTextLength: value?.text != null ? String(value.text).length : 0,
      mediaIdsLength: value?.mediaIds?.length ?? 0,
      valid,
      blockErrs: blockErrs.length ? blockErrs : "(none)",
      hasContent: content,
    });

    if (!valid) {
      errs.push(...blockErrs);
      if (block.blockId && blockErrs.length > 0) {
        errorsByBlockId[block.blockId] = blockErrs;
      }
    }
    if (content) {
      hasAnyContent = true;
    }
  }

  if ((blocksList?.length ?? 0) > 0 && !hasAnyContent) {
    const noContentMsg = "Add content to at least one block";
    errs.push(noContentMsg);
    const first = blocksList?.[0];
    if (first?.blockId) {
      errorsByBlockId[first.blockId] = [...(errorsByBlockId[first.blockId] || []), noContentMsg];
    }
    debugLog("no content in any block, added global error");
  }

  debugLog("result", { hasAnyContent, errorCount: errs.length, errors: errs, errorsByBlockId });

  return { valid: errs.length === 0, errors: errs, errorsByBlockId };
}
