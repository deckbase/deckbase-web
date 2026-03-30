import { NextResponse } from "next/server";
import { requireElevenLabsAuth } from "@/lib/elevenlabs-auth";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";
import {
  CREDIT_COST_BY_MODEL,
  checkImageGenerationLimit,
  incrementImageUsage,
} from "@/lib/usage-limits";
import {
  ALLOWED_TEXT_TO_IMAGE_MODEL_IDS,
  isAllowedTextToImageModel,
} from "@/lib/fal-image-models";
import {
  generateFalTextToImageServer,
  generateFalNanoBananaEditServer,
  AI_IMAGE_MAX_PROMPT_LEN,
} from "@/lib/ai-image-generation";

const NANO_BANANA_EDIT_MODEL = "fal-ai/nano-banana-2/edit";
/** Max JSON body size for base64 data URLs (~4.5MB string). */
const MAX_REFERENCE_DATA_URL_CHARS = 6_000_000;

const DEFAULT_MODEL = "fal-ai/flux/schnell";

/**
 * POST /api/ai/generate-image
 * Body: {
 *   prompt: string,
 *   model_id?: string,
 *   style_prompt_id?: string,
 *   reference_image_url?: string,
 *   reference_image_data_url?: string,
 *   uid?: string
 * } (uid when using X-API-Key for mobile). If reference_image_url or reference_image_data_url is set,
 * runs fal-ai/nano-banana-2/edit (style_prompt_id not supported in that mode).
 * Returns: { imageUrl: string, model_id: string, requestId: string | null }
 */
export async function POST(request) {
  try {
    const authResult = await requireElevenLabsAuth(request);
    if (!authResult.ok) return authResult.response;

    if (!process.env.FAL_KEY?.trim()) {
      return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 503 });
    }

    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const stylePromptId =
      typeof body.style_prompt_id === "string" ? body.style_prompt_id.trim() : "";
    const bodyUid = typeof body.uid === "string" ? body.uid.trim() : "";
    const effectiveUid = authResult.uid || bodyUid || null;
    let modelId = typeof body.model_id === "string" ? body.model_id.trim() : DEFAULT_MODEL;
    if (!modelId) modelId = DEFAULT_MODEL;

    const referenceImageUrl =
      typeof body.reference_image_url === "string" ? body.reference_image_url.trim() : "";
    const referenceDataUrl =
      typeof body.reference_image_data_url === "string" ? body.reference_image_data_url.trim() : "";
    const useReference = Boolean(referenceImageUrl || referenceDataUrl);

    if (!useReference) {
      if (!isAllowedTextToImageModel(modelId)) {
        return NextResponse.json(
          {
            error: "Unsupported model_id",
            allowed: [...ALLOWED_TEXT_TO_IMAGE_MODEL_IDS],
          },
          { status: 400 }
        );
      }

      if (CREDIT_COST_BY_MODEL[modelId] == null) {
        return NextResponse.json({ error: "Unknown model credit mapping" }, { status: 400 });
      }
    } else {
      if (stylePromptId) {
        return NextResponse.json(
          { error: "style_prompt_id is not supported with reference_image" },
          { status: 400 }
        );
      }
      if (referenceDataUrl.length > MAX_REFERENCE_DATA_URL_CHARS) {
        return NextResponse.json(
          { error: "Reference image payload too large; use a smaller file or pick from the card." },
          { status: 400 }
        );
      }
      if (CREDIT_COST_BY_MODEL[NANO_BANANA_EDIT_MODEL] == null) {
        return NextResponse.json({ error: "Unknown model credit mapping" }, { status: 400 });
      }
    }

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Missing or empty prompt" }, { status: 400 });
    }
    if (prompt.length > AI_IMAGE_MAX_PROMPT_LEN) {
      return NextResponse.json(
        { error: `Prompt too long (max ${AI_IMAGE_MAX_PROMPT_LEN} characters)` },
        { status: 400 }
      );
    }

    const creditModelId = useReference ? NANO_BANANA_EDIT_MODEL : modelId;

    if (process.env.NODE_ENV === "production" && effectiveUid) {
      const entitled = await isBasicOrProOrVip(effectiveUid);
      if (!entitled) {
        return NextResponse.json(
          { error: "Active subscription required for AI image generation" },
          { status: 403 }
        );
      }
      const limitCheck = await checkImageGenerationLimit(effectiveUid, creditModelId);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: limitCheck.message || "Monthly AI image credit limit reached" },
          { status: 403 }
        );
      }
    }

    let out;
    try {
      if (useReference) {
        const imageUrls = [referenceImageUrl || referenceDataUrl];
        out = await generateFalNanoBananaEditServer({
          prompt,
          imageUrls,
        });
      } else {
        out = await generateFalTextToImageServer({
          modelId,
          prompt,
          stylePromptId: stylePromptId || undefined,
        });
      }
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes("Unknown style_prompt_id") || msg.includes("Unsupported model")) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      if (msg.includes("too long")) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      throw e;
    }

    if (effectiveUid) {
      incrementImageUsage(effectiveUid, creditModelId).catch((err) =>
        console.warn("[ai/generate-image] usage increment failed", err?.message)
      );
    }

    return NextResponse.json({
      imageUrl: out.imageUrl,
      model_id: out.modelId,
      requestId: out.requestId,
    });
  } catch (error) {
    console.error("[ai/generate-image]", error);
    const message = error?.message || "Failed to generate image";
    return NextResponse.json(
      { error: "Image generation failed", message: String(message).slice(0, 500) },
      { status: 500 }
    );
  }
}
