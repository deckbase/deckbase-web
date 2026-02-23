import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as fal from "@fal-ai/client";
import { v4 as uuidv4 } from "uuid";

const RARITY_TIERS = ["common", "rare", "epic", "legendary"];

function scoreToRarity(score) {
  if (score <= 25) return { tier: "common", score: 15 };
  if (score <= 50) return { tier: "rare", score: 45 };
  if (score <= 75) return { tier: "epic", score: 65 };
  return { tier: "legendary", score: 90 };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  const description = (body.description ?? "").trim();

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const falKey = process.env.FAL_KEY?.trim();
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 503 }
    );
  }
  if (!falKey) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured." },
      { status: 503 }
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    fal.config({ credentials: falKey });

    const prompt = `You are a Yu-Gi-Oh style card designer for a learning app. Given a vocabulary/learning card:

Title: ${title}
${description ? `Description/meaning: ${description}` : ""}

Return a JSON object only, no markdown, with these exact keys:
- ai_complexity_score: number 0-100 (how complex/difficult the word or concept is)
- effect_text: string, 1-2 sentences, Yu-Gi-Oh card effect style (e.g. "When this card is revealed, gain ATK equal to its rarity. If the answer is correct, draw 1 XP.")
- card_type: "MONSTER"
- atk: number 0-2500 (scale by complexity: low=500-1000, mid=1000-1800, high=1800-2500)
- def: number 0-2500 (scale similarly)
- trigger_type: one of "TYPED" | "MCQ" | "CLOZE" (choose based on what fits the card best; prefer TYPED for single-answer vocabulary)`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content?.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text.replace(/```json?\s*|\s*```/g, "").trim());
    const aiScore = Math.min(100, Math.max(0, Number(parsed.ai_complexity_score) ?? 50));
    const { tier: rarityTier, score: rarityScore } = scoreToRarity(aiScore);
    const atk = Math.min(2500, Math.max(0, Number(parsed.atk) ?? 1000));
    const def = Math.min(2500, Math.max(0, Number(parsed.def) ?? 1000));
    const effectText = String(parsed.effect_text ?? "").trim() || "When this card is revealed, gain XP equal to its ATK if the answer is correct.";
    const triggerType = ["TYPED", "MCQ", "CLOZE"].includes(parsed.trigger_type) ? parsed.trigger_type : "TYPED";

    let imageUrl = "";
    try {
      const imageResult = await fal.subscribe("fal-ai/flux/dev", {
        input: {
          prompt: `Yu-Gi-Oh style fantasy trading card art: ${title}. ${description ? description.slice(0, 80) : ""}. Dark, dramatic, portrait orientation, card illustration.`,
          image_size: "portrait_4_3",
          num_images: 1,
        },
      });
      const data = imageResult.data;
      if (data?.images?.[0]?.url) imageUrl = data.images[0].url;
      else if (data?.image?.url) imageUrl = data.image.url;
      else if (typeof data?.url === "string") imageUrl = data.url;
    } catch (imgErr) {
      console.warn("[generate-concept] Fal image failed:", imgErr.message);
    }

    const conceptId = uuidv4();
    const payload = {
      conceptId,
      title,
      description: description || "",
      rarityScore,
      rarityTier,
      cardType: "MONSTER",
      atk,
      def,
      effectText,
      triggerType,
      imageUrl,
      aiComplexityScore: aiScore,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[generate-concept]", err);
    return NextResponse.json(
      { message: err.message || "Generation failed" },
      { status: 500 }
    );
  }
}
