/**
 * Shared fal.ai per-model credit weights (no server-only deps — safe for client bundles).
 * Keep in sync with docs/features/AI_IMAGE_FAL_FEASIBILITY.md.
 */

/**
 * Integer credits per successful fal call, keyed by resolved `model_id`.
 * Includes text-to-image and reference/edit endpoints.
 */
export const CREDIT_COST_BY_MODEL = {
  "fal-ai/flux/schnell": 1,
  "fal-ai/flux/dev": 1,
  "fal-ai/nano-banana-2": 3,
  "fal-ai/qwen-image": 1,
  "fal-ai/recraft/v3/text-to-image": 2,
  "fal-ai/nano-banana-pro": 5,
  "fal-ai/stable-diffusion-v35-large": 2,
  "fal-ai/fast-sdxl": 1,
  "xai/grok-imagine-image": 1,
  "fal-ai/flux-pro/kontext": 2,
  "fal-ai/nano-banana-2/edit": 3,
  "fal-ai/nano-banana-pro/edit": 5,
  "fal-ai/stable-diffusion-v3-medium/image-to-image": 2,
  "fal-ai/fast-sdxl/image-to-image": 1,
};
