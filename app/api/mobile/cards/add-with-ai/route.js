import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCardPrompt } from "@/lib/card-ai-prompt";
import { BlockTypeNames } from "@/utils/firestore";
import { getAdminAuth } from "@/utils/firebase-admin";
import {
  isAvailable as isAdminAvailable,
  getDeckAdmin,
  getTemplateAdmin,
  getCardsForExamplesAdmin,
  createCardAdmin,
  uploadAudioBufferAdmin,
} from "@/lib/firestore-admin";
import { generateTTS } from "@/lib/elevenlabs-server";
import { isProOrVip } from "@/lib/revenuecat-server";

function normalizeBlockType(type) {
  if (type == null) return "text";
  if (typeof type === "number" && BlockTypeNames[type] != null) return BlockTypeNames[type];
  return String(type);
}

function parseCardFromParsed(parsed, templateBlocks, normalizeBlockType) {
  const values = [];
  for (const block of templateBlocks) {
    const type = normalizeBlockType(block.type);
    if (!["header1", "header2", "header3", "text", "example", "hiddenText", "audio"].includes(type))
      continue;
    const text = parsed[block.blockId] != null ? String(parsed[block.blockId]).trim() : "";
    values.push({ blockId: block.blockId, type, text: text || "" });
  }
  return values;
}

const isAudioBlock = (b) => b.type === "audio" || b.type === 7 || b.type === "7";

/**
 * POST /api/mobile/cards/add-with-ai
 * Auth: Authorization: Bearer <Firebase ID token>
 * Body: { deckId: string, templateId: string, count?: 1-5 }
 * Creates cards with AI and optionally generates audio if template has audio block.
 * Returns: { created: number, cardIds: string[] }
 */
export async function POST(request) {
  try {
    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Server auth not configured" },
        { status: 503 }
      );
    }
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization: Bearer <token>" },
        { status: 401 }
      );
    }
    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    const uid = decoded.uid;

    if (process.env.NODE_ENV === "production") {
      const entitled = await isProOrVip(uid);
      if (!entitled) {
        return NextResponse.json(
          { error: "Active subscription required to use AI features" },
          { status: 403 }
        );
      }
    }

    if (!isAdminAvailable()) {
      return NextResponse.json(
        { error: "Server storage not configured" },
        { status: 503 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    const count = Math.min(5, Math.max(1, Number(body.count) || 1));

    if (!deckId || !templateId) {
      return NextResponse.json(
        { error: "deckId and templateId are required" },
        { status: 400 }
      );
    }

    const deck = await getDeckAdmin(uid, deckId);
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    const template = await getTemplateAdmin(uid, templateId);
    if (!template || !template.blocks?.length) {
      return NextResponse.json({ error: "Template not found or has no blocks" }, { status: 404 });
    }

    const exampleCards = await getCardsForExamplesAdmin(uid, deckId, 5);
    const templateBlocks = template.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
    }));

    const { system, user } = buildCardPrompt({
      deckTitle: deck.title || "",
      deckDescription: deck.description || "",
      templateBlocks,
      exampleCards,
      count,
    });

    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: count > 1 ? 2048 : 1024,
      system,
      messages: [{ role: "user", content: user }],
    });

    const rawText =
      msg.content?.find((c) => c.type === "text")?.text?.trim() ?? (count > 1 ? "[]" : "{}");
    const jsonStr = rawText.replace(/```json?\s*|\s*```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[mobile add-with-ai] JSON parse failed", e.message);
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: jsonStr?.slice(0, 300) },
        { status: 502 }
      );
    }

    const generatedCards = [];
    if (count > 1) {
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (let i = 0; i < count && i < arr.length; i++) {
        const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
        generatedCards.push(parseCardFromParsed(item, templateBlocks, normalizeBlockType));
      }
    } else {
      generatedCards.push(parseCardFromParsed(parsed, templateBlocks, normalizeBlockType));
    }

    const blocksSnapshot = template.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
      required: b.required || false,
      configJson: b.configJson,
    }));
    const audioBlock = blocksSnapshot.find(isAudioBlock);
    const mainBlockId = template.mainBlockId || null;
    const subBlockId = template.subBlockId || null;

    const getContentKey = (vals) => {
      const mainVal = mainBlockId ? vals.find((v) => v.blockId === mainBlockId) : null;
      const subVal = subBlockId ? vals.find((v) => v.blockId === subBlockId) : null;
      const mainText = (mainVal?.text != null ? String(mainVal.text).trim() : "") || "";
      const subText = (subVal?.text != null ? String(subVal.text).trim() : "") || "";
      return `${mainText}\n${subText}`;
    };

    const contentKeys = new Set();
    const cardIds = [];
    for (let i = 0; i < generatedCards.length; i++) {
      let values = [...generatedCards[i]];

      const contentKey = getContentKey(values);
      if (contentKeys.has(contentKey)) continue;
      contentKeys.add(contentKey);

      if (audioBlock) {
        let mainText = "";
        if (mainBlockId) {
          const mainVal = values.find((v) => v.blockId === mainBlockId);
          mainText = (mainVal?.text != null ? String(mainVal.text) : "").trim();
        }
        if (!mainText) {
          const first = values.find((v) => String(v?.text || "").trim());
          mainText = first ? String(first.text).trim() : "";
        }
        if (mainText) {
          try {
            let voiceId;
            if (audioBlock.configJson) {
              try {
                const c = JSON.parse(audioBlock.configJson);
                voiceId = c.defaultVoiceId || undefined;
              } catch {}
            }
            const buffer = await generateTTS({ text: mainText, voiceId });
            if (buffer) {
              const { mediaId } = await uploadAudioBufferAdmin(uid, buffer, "audio/mpeg");
              const audioIdx = values.findIndex((v) => v.blockId === audioBlock.blockId);
              if (audioIdx >= 0) {
                values[audioIdx] = { ...values[audioIdx], mediaIds: [mediaId] };
              } else {
                values.push({
                  blockId: audioBlock.blockId,
                  type: "audio",
                  text: "",
                  mediaIds: [mediaId],
                });
              }
            }
          } catch (err) {
            console.warn("[mobile add-with-ai] TTS/upload failed for card", i, err);
          }
        }
      }


      const { cardId } = await createCardAdmin(
        uid,
        deckId,
        templateId,
        blocksSnapshot,
        values,
        template.mainBlockId ?? null,
        template.subBlockId ?? null
      );
      cardIds.push(cardId);
    }

    return NextResponse.json({
      created: cardIds.length,
      cardIds,
      skippedDuplicates: generatedCards.length - cardIds.length,
    });
  } catch (err) {
    console.error("[mobile add-with-ai]", err);
    return NextResponse.json(
      { error: "Failed to add cards", message: err?.message },
      { status: 500 }
    );
  }
}
