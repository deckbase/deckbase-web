/**
 * Shared fal.ai text-to-image call (server-only). Used by POST /api/ai/generate-image and MCP.
 */

import { fal } from "@fal-ai/client";
import { getStylePromptById, mergeStylePrompt } from "@/lib/image-style-prompts";
import {
  buildTextToImageInput,
  isAllowedTextToImageModel,
  pickImageUrlFromFalResult,
} from "@/lib/fal-image-models";

const DEFAULT_MODEL = "fal-ai/flux/schnell";
export const AI_IMAGE_MAX_PROMPT_LEN = 8000;

/**
 * @param {{ modelId?: string, prompt: string, stylePromptId?: string }} params
 * @returns {Promise<{ imageUrl: string, modelId: string, requestId: string | null, finalPrompt: string }>}
 */
export async function generateFalTextToImageServer(params) {
  if (!process.env.FAL_KEY?.trim()) {
    throw new Error("FAL_KEY is not configured");
  }
  const modelId =
    typeof params.modelId === "string" && params.modelId.trim()
      ? params.modelId.trim()
      : DEFAULT_MODEL;
  if (!isAllowedTextToImageModel(modelId)) {
    throw new Error("Unsupported model_id");
  }
  const base = typeof params.prompt === "string" ? params.prompt.trim() : "";
  if (!base) {
    throw new Error("Missing or empty prompt");
  }
  const styleId =
    typeof params.stylePromptId === "string" ? params.stylePromptId.trim() : "";
  let finalPrompt = base;
  if (styleId) {
    const preset = getStylePromptById(styleId);
    if (!preset) {
      throw new Error("Unknown style_prompt_id");
    }
    finalPrompt = mergeStylePrompt(finalPrompt, preset.snippet);
  }
  if (finalPrompt.length > AI_IMAGE_MAX_PROMPT_LEN) {
    throw new Error(
      `Prompt too long after style (max ${AI_IMAGE_MAX_PROMPT_LEN} characters)`,
    );
  }
  const input = buildTextToImageInput(modelId, finalPrompt);
  const result = await fal.subscribe(modelId, {
    input,
    logs: false,
  });
  const imageUrl = pickImageUrlFromFalResult(result.data);
  if (!imageUrl) {
    throw new Error("Image generation returned no image URL");
  }
  return {
    imageUrl,
    modelId,
    requestId: result.requestId ?? null,
    finalPrompt,
  };
}

const NANO_BANANA_EDIT_MODEL = "fal-ai/nano-banana-2/edit";

/**
 * Nano Banana 2 edit: prompt + one or more image URLs (https or data URI).
 * @param {{ prompt: string, imageUrls: string[] }} params
 * @returns {Promise<{ imageUrl: string, modelId: string, requestId: string | null, finalPrompt: string }>}
 */
export async function generateFalNanoBananaEditServer(params) {
  if (!process.env.FAL_KEY?.trim()) {
    throw new Error("FAL_KEY is not configured");
  }
  const base = typeof params.prompt === "string" ? params.prompt.trim() : "";
  if (!base) {
    throw new Error("Missing or empty prompt");
  }
  const imageUrls = Array.isArray(params.imageUrls)
    ? params.imageUrls.filter((u) => typeof u === "string" && u.trim().length > 0)
    : [];
  if (imageUrls.length === 0) {
    throw new Error("At least one reference image URL is required");
  }
  if (base.length > AI_IMAGE_MAX_PROMPT_LEN) {
    throw new Error(
      `Prompt too long (max ${AI_IMAGE_MAX_PROMPT_LEN} characters)`,
    );
  }
  const result = await fal.subscribe(NANO_BANANA_EDIT_MODEL, {
    input: {
      prompt: base,
      image_urls: imageUrls,
      num_images: 1,
    },
    logs: false,
  });
  const imageUrl = pickImageUrlFromFalResult(result.data);
  if (!imageUrl) {
    throw new Error("Image edit returned no image URL");
  }
  return {
    imageUrl,
    modelId: NANO_BANANA_EDIT_MODEL,
    requestId: result.requestId ?? null,
    finalPrompt: base,
  };
}
