/**
 * Base block validator with abstract validate() and getErrorMessages().
 * Concrete validators extend this and implement both methods per block type.
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

/** Text blocks: header1, header2, header3, text, example, hiddenText */
export class TextBlockValidator extends BaseBlockValidator {
  validate(block, value) {
    if (!block.required) return true;
    const text = value?.text;
    return text != null && String(text).trim().length > 0;
  }

  getErrorMessages(block, value) {
    if (!block.required) return [];
    const text = value?.text;
    if (!text || !String(text).trim()) {
      return [`${label(block)} is required`];
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

  getErrorMessages(block, value) {
    if (!block.required) return [];
    const ids = value?.mediaIds;
    if (!Array.isArray(ids) || ids.length === 0) {
      return [`${label(block)} is required`];
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

  getErrorMessages(block, value) {
    if (!block.required) return [];
    const ids = value?.mediaIds;
    if (!Array.isArray(ids) || ids.length === 0) {
      return [`${label(block)} is required`];
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
  const lb = label;

  class QuizSingleSelectValidator extends BaseBlockValidator {
    validate(block, value) {
      const config = getBlockConfig(block);
      if (!config?.question || !String(config.question).trim()) return false;
      const options = config.options;
      const opts = Array.isArray(options) ? options.filter((o) => o != null && String(o).trim()) : [];
      if (opts.length === 0) return false;
      const correctIndex = config.correctAnswerIndex;
      return typeof correctIndex === "number" && correctIndex >= 0 && correctIndex < opts.length;
    }

    getErrorMessages(block, value) {
      const config = getBlockConfig(block);
      const errs = [];
      if (!config?.question || !String(config.question).trim()) {
        errs.push(`${lb(block)}: question is required`);
        return errs;
      }
      const options = config.options;
      const opts = Array.isArray(options) ? options.filter((o) => o != null && String(o).trim()) : [];
      if (opts.length === 0) {
        errs.push(`${lb(block)}: add at least one option`);
        return errs;
      }
      const correctIndex = config.correctAnswerIndex;
      if (typeof correctIndex !== "number" || correctIndex < 0 || correctIndex >= opts.length) {
        errs.push(`${lb(block)}: select the correct answer`);
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
      if (opts.length === 0) return false;
      const correctIndices = config.correctAnswerIndices;
      const correctAnswers = config.correctAnswers;
      return (Array.isArray(correctIndices) && correctIndices.length > 0) ||
        (Array.isArray(correctAnswers) && correctAnswers.length > 0);
    }

    getErrorMessages(block, value) {
      const config = getBlockConfig(block);
      const errs = [];
      if (!config?.question || !String(config.question).trim()) {
        errs.push(`${lb(block)}: question is required`);
        return errs;
      }
      const options = config.options;
      const opts = Array.isArray(options) ? options.filter((o) => o != null && String(o).trim()) : [];
      if (opts.length === 0) {
        errs.push(`${lb(block)}: add at least one option`);
        return errs;
      }
      const correctIndices = config.correctAnswerIndices;
      const correctAnswers = config.correctAnswers;
      const hasCorrect = (Array.isArray(correctIndices) && correctIndices.length > 0) ||
        (Array.isArray(correctAnswers) && correctAnswers.length > 0);
      if (!hasCorrect) {
        errs.push(`${lb(block)}: select at least one correct answer`);
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

    getErrorMessages(block, value) {
      const config = getBlockConfig(block);
      const errs = [];
      if (!config?.question || !String(config.question).trim()) {
        errs.push(`${lb(block)}: question is required`);
        return errs;
      }
      const correct = config.correctAnswer;
      if (correct == null || !String(correct).trim()) {
        errs.push(`${lb(block)}: correct answer is required`);
      }
      return errs;
    }

    hasContent() {
      return true;
    }
  }

  return { QuizSingleSelectValidator, QuizMultiSelectValidator, QuizTextAnswerValidator };
}

/** Layout blocks (divider, space): no value validation */
export class LayoutBlockValidator extends BaseBlockValidator {
  validate() {
    return true;
  }

  getErrorMessages() {
    return [];
  }
}

/** All block types that must have a validator (Firestore BlockType + UI alias "example"). */
export const ALL_BLOCK_TYPES = [
  "header1",
  "header2",
  "header3",
  "text",
  "quote",       // Firestore BlockType.quote (index 4)
  "example",     // UI alias for quote
  "hiddenText",
  "image",
  "audio",
  "quizMultiSelect",
  "quizSingleSelect",
  "quizTextAnswer",
  "divider",
  "space",
];

/**
 * Build the validator registry map (block type string -> validator instance).
 * Every entry in ALL_BLOCK_TYPES is implemented. getBlockConfig(block) is used by quiz validators.
 */
export function createValidatorRegistry(getBlockConfig) {
  const textValidator = new TextBlockValidator();
  const imageValidator = new ImageBlockValidator();
  const audioValidator = new AudioBlockValidator();
  const layoutValidator = new LayoutBlockValidator();
  const { QuizSingleSelectValidator, QuizMultiSelectValidator, QuizTextAnswerValidator } =
    createQuizValidators(getBlockConfig);

  const registry = new Map([
    ["header1", textValidator],
    ["header2", textValidator],
    ["header3", textValidator],
    ["text", textValidator],
    ["quote", textValidator],
    ["example", textValidator],
    ["hiddenText", textValidator],
    ["image", imageValidator],
    ["audio", audioValidator],
    ["divider", layoutValidator],
    ["space", layoutValidator],
    ["quizSingleSelect", new QuizSingleSelectValidator()],
    ["quizMultiSelect", new QuizMultiSelectValidator()],
    ["quizTextAnswer", new QuizTextAnswerValidator()],
  ]);

  for (const type of ALL_BLOCK_TYPES) {
    if (!registry.has(type)) {
      throw new Error(`Block validator missing for type: ${type}`);
    }
  }
  return registry;
}

/** Default for unknown block types: always valid, no content. */
const defaultValidator = new LayoutBlockValidator();

/**
 * Run validation on all blocks and return { valid, errors }.
 * resolveBlockType(block) should return the string type (e.g. "header1", "quizSingleSelect").
 */
export function getBlockValidationErrors(blocksList, valuesObj, { resolveBlockType, getBlockConfig }) {
  const errs = [];
  let hasAnyContent = false;
  const registry = createValidatorRegistry(getBlockConfig);

  for (const block of blocksList || []) {
    const blockType = resolveBlockType(block);
    const value = valuesObj?.[block.blockId];
    const validator = registry.get(blockType) ?? defaultValidator;

    if (!validator.validate(block, value)) {
      errs.push(...validator.getErrorMessages(block, value));
    }
    if (validator.hasContent(block, value)) {
      hasAnyContent = true;
    }
  }

  if ((blocksList?.length ?? 0) > 0 && !hasAnyContent) {
    errs.push("Add content to at least one block");
  }

  return { valid: errs.length === 0, errors: errs };
}
