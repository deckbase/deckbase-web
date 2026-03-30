/**
 * fal.ai text-to-image: allowlist and per-model input shapes for server routes.
 * Credit weights live in usage-limits.js (CREDIT_COST_BY_MODEL).
 */

import { CREDIT_COST_BY_MODEL } from "./fal-credit-costs";

/** User-facing labels for the card editor model picker (order matches allowlist). */
const TEXT_TO_IMAGE_MODEL_LABELS = {
  "fal-ai/flux/schnell": "FLUX Schnell (fast)",
  "fal-ai/flux/dev": "FLUX Dev",
  "fal-ai/nano-banana-2": "Nano Banana 2",
  "fal-ai/qwen-image": "Qwen Image",
  "fal-ai/recraft/v3/text-to-image": "Recraft V3",
  "fal-ai/nano-banana-pro": "Nano Banana Pro",
  "fal-ai/stable-diffusion-v35-large": "Stable Diffusion 3.5 Large",
  "fal-ai/fast-sdxl": "Fast SDXL",
  "xai/grok-imagine-image": "Grok Imagine",
};

/** @type {readonly string[]} */
export const ALLOWED_TEXT_TO_IMAGE_MODEL_IDS = [
  "fal-ai/flux/schnell",
  "fal-ai/flux/dev",
  "fal-ai/nano-banana-2",
  "fal-ai/qwen-image",
  "fal-ai/recraft/v3/text-to-image",
  "fal-ai/nano-banana-pro",
  "fal-ai/stable-diffusion-v35-large",
  "fal-ai/fast-sdxl",
  "xai/grok-imagine-image",
];

const ALLOWED_SET = new Set(ALLOWED_TEXT_TO_IMAGE_MODEL_IDS);

/**
 * Options for the dashboard image “Generate with AI” model dropdown.
 * @type {readonly { id: string, label: string, credits: number }[]}
 */
export const TEXT_TO_IMAGE_MODEL_OPTIONS = ALLOWED_TEXT_TO_IMAGE_MODEL_IDS.map((id) => ({
  id,
  label: TEXT_TO_IMAGE_MODEL_LABELS[id] || id,
  credits: CREDIT_COST_BY_MODEL[id] ?? 1,
}));

/**
 * @param {string} modelId
 * @returns {boolean}
 */
export function isAllowedTextToImageModel(modelId) {
  return typeof modelId === "string" && ALLOWED_SET.has(modelId.trim());
}

/**
 * Build fal `input` for text-to-image. Model-specific fields avoid generic validation errors.
 * @param {string} modelId
 * @param {string} prompt
 * @returns {Record<string, unknown>}
 */
export function buildTextToImageInput(modelId, prompt) {
  const p = typeof prompt === "string" ? prompt.trim() : "";
  if (!p) {
    throw new Error("Prompt is required");
  }

  if (modelId.startsWith("fal-ai/flux/")) {
    return {
      prompt: p,
      image_size: "square_hd",
      num_images: 1,
    };
  }

  if (modelId === "fal-ai/recraft/v3/text-to-image") {
    return { prompt: p };
  }

  if (modelId === "fal-ai/stable-diffusion-v35-large" || modelId === "fal-ai/fast-sdxl") {
    return { prompt: p, num_images: 1 };
  }

  if (modelId === "fal-ai/qwen-image") {
    return { prompt: p, num_images: 1 };
  }

  if (modelId === "fal-ai/nano-banana-2" || modelId === "fal-ai/nano-banana-pro") {
    return { prompt: p };
  }

  if (modelId === "xai/grok-imagine-image") {
    return { prompt: p };
  }

  return { prompt: p, num_images: 1 };
}

/**
 * Extract image URL from fal subscribe result (shape varies slightly by model).
 * @param {unknown} data
 * @returns {string | null}
 */
export function pickImageUrlFromFalResult(data) {
  if (!data || typeof data !== "object") return null;
  const d = /** @type {{ images?: Array<{ url?: string }> }} */ (data);
  const url = d.images?.[0]?.url;
  return typeof url === "string" && url.length > 0 ? url : null;
}
