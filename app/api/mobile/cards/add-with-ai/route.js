import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCardPrompt } from "@/lib/card-ai-prompt";
import { BlockTypeNames } from "@/utils/firestore";
import {
  isAvailable as isAdminAvailable,
  getDeckAdmin,
  getTemplateAdmin,
  getCardsForExamplesAdmin,
  uploadAudioBufferAdmin,
} from "@/lib/firestore-admin";
import { generateTTS } from "@/lib/elevenlabs-server";
import { parseAudioBlockConfig } from "@/lib/audio-block-config";
import { isProOrVip } from "@/lib/revenuecat-server";

function normalizeBlockType(type) {
  if (type == null) return "text";
  if (typeof type === "number" && BlockTypeNames[type] != null) return BlockTypeNames[type];
  if (typeof type === "string" && /^\d+$/.test(type)) {
    const n = parseInt(type, 10);
    if (BlockTypeNames[n] != null) return BlockTypeNames[n];
  }
  return String(type);
}

function parseCardFromParsed(parsed, templateBlocks, normalizeBlockType) {
  const values = [];
  for (const block of templateBlocks) {
    const type = normalizeBlockType(block.type);
    const include = ["header1", "header2", "header3", "text", "example", "hiddenText", "audio"].includes(type);
    const rawVal = parsed[block.blockId];
    const text = rawVal != null ? String(rawVal).trim() : "";
    if (include) values.push({ blockId: block.blockId, type, text: text || "" });
    if (process.env.DECKBASE_DEBUG_ADD_WITH_AI === "true") {
      console.log("[mobile add-with-ai] block", {
        blockId: block.blockId,
        rawType: block.type,
        normalizedType: type,
        include,
        parsedKeyExists: block.blockId != null && block.blockId in parsed,
        textLen: text.length,
      });
    }
  }
  return values;
}

const isAudioBlock = (b) => b.type === "audio" || b.type === 7 || b.type === "7";

/**
 * POST /api/mobile/cards/add-with-ai
 * Auth: X-API-Key: <DECKBASE_API_KEY> (dashboard API keys are for MCP only).
 * Body: { deckId: string, templateId: string, uid: string, count?: 1-5 }
 * Generates card content with AI and optionally TTS for audio blocks.
 * Does NOT create cards — returns { cards } for the client to show; client then calls
 * POST /api/mobile/cards/add with selected cards to add them to the deck.
 * Returns: { cards: [{ templateId, blocksSnapshot, values, mainBlockId, subBlockId }] }
 */
export async function POST(request) {
  try {
    const apiKeyHeader = request.headers.get("x-api-key")?.trim();
    const expectedKey = process.env.DECKBASE_API_KEY?.trim();
    if (!expectedKey || apiKeyHeader !== expectedKey) {
      return NextResponse.json(
        { error: "Missing or invalid X-API-Key (mobile API key)" },
        { status: 401 }
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
    const uid = typeof body.uid === "string" ? body.uid.trim() : "";
    const count = Math.min(5, Math.max(1, Number(body.count) || 1));

    if (!deckId || !templateId || !uid) {
      return NextResponse.json(
        { error: "deckId, templateId, and uid are required" },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === "production" && process.env.REQUIRE_PRO_FOR_AI !== "false") {
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

    const deck = await getDeckAdmin(uid, deckId);
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    const template = await getTemplateAdmin(uid, templateId);
    if (!template) {
      console.warn("[mobile add-with-ai] Template not found", {
        uid,
        templateId,
        path: `users/${uid}/templates/${templateId}`,
      });
      return NextResponse.json(
        { error: "Template not found", code: "template_not_found" },
        { status: 404 }
      );
    }
    const templateBlocksRaw = template.blocks;
    const templateBlocksArray = Array.isArray(templateBlocksRaw)
      ? templateBlocksRaw
      : templateBlocksRaw && typeof templateBlocksRaw === "object"
        ? Object.values(templateBlocksRaw)
        : [];
    if (templateBlocksArray.length === 0) {
      console.warn("[mobile add-with-ai] Template has no blocks", {
        uid,
        templateId,
        path: `users/${uid}/templates/${templateId}`,
      });
      return NextResponse.json(
        { error: "Template has no blocks", code: "template_no_blocks" },
        { status: 404 }
      );
    }

    const exampleCards = await getCardsForExamplesAdmin(uid, deckId, 5);
    const existingDeckCards = await getCardsForExamplesAdmin(uid, deckId, 200);
    const mainBlockId = template.mainBlockId || null;
    const subBlockId = template.subBlockId || null;

    const getOrderedTexts = (card) =>
      Object.values(card)
        .filter((t) => t != null && String(t).trim())
        .map((t) => String(t).trim());
    const avoidMainPhrases =
      existingDeckCards.length > 0
        ? [
            ...new Set(
              existingDeckCards.flatMap((card) => {
                const texts = getOrderedTexts(card);
                const main = mainBlockId ? (card[mainBlockId] ?? "").trim() || texts[0] : texts[0];
                return main ? [main] : [];
              }).filter(Boolean)
            ),
          ]
        : [];

    const normalizeContentKey = (s) => (s == null ? "" : String(s).trim().toLowerCase());
    const existingContentKeys = new Set(
      existingDeckCards
        .map((card) => {
          const texts = getOrderedTexts(card);
          const m = (mainBlockId && card[mainBlockId] != null ? String(card[mainBlockId]).trim() : null) || texts[0] || "";
          const sub = (subBlockId && card[subBlockId] != null ? String(card[subBlockId]).trim() : null) || texts[1] || "";
          return normalizeContentKey(`${m}\n${sub}`);
        })
        .filter(Boolean)
    );

    const templateBlocks = templateBlocksArray.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
    }));

    console.log("[mobile add-with-ai] template blocks", {
      count: templateBlocks.length,
      blocks: templateBlocks.map((b) => ({
        blockId: b.blockId,
        blockIdType: typeof b.blockId,
        type: b.type,
        typeOf: typeof b.type,
        normalizedType: normalizeBlockType(b.type),
        label: b.label,
      })),
    });

    const { system, user } = buildCardPrompt({
      deckTitle: deck.title || "",
      deckDescription: deck.description || "",
      templateBlocks,
      exampleCards,
      count,
      mainBlockId,
      subBlockId,
      mainBlockLabel: templateBlocksArray.find((b) => b.blockId === mainBlockId)?.label ?? null,
      subBlockLabel: templateBlocksArray.find((b) => b.blockId === subBlockId)?.label ?? null,
      avoidMainPhrases,
    });

    if (avoidMainPhrases.length > 0) {
      console.log("[mobile add-with-ai] avoid list from deck", { count: avoidMainPhrases.length, sample: avoidMainPhrases.slice(0, 5) });
    }
    if (existingContentKeys.size > 0) {
      console.log("[mobile add-with-ai] existing content keys (skip if match)", { count: existingContentKeys.size });
    }

    console.log("[mobile add-with-ai] prompt", {
      system: system?.slice(0, 500) + (system?.length > 500 ? "..." : ""),
      userFull: user,
      systemFull: system,
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

    const parsedKeys = Array.isArray(parsed) ? (parsed[0] ? Object.keys(parsed[0]) : []) : Object.keys(parsed || {});
    console.log("[mobile add-with-ai] AI response", {
      isArray: Array.isArray(parsed),
      parsedKeys,
      sampleValues: Array.isArray(parsed)
        ? parsed.slice(0, 1).map((o) => (o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 50) : v])) : {}))
        : parsed && typeof parsed === "object"
          ? Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 50) : v]))
          : {},
    });

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

    console.log("[mobile add-with-ai] parseCardFromParsed result", {
      generatedCardsCount: generatedCards.length,
      firstCardValues: generatedCards[0]?.map((v) => ({
        blockId: v.blockId,
        type: v.type,
        textLength: v.text?.length ?? 0,
        textPreview: v.text != null ? String(v.text).slice(0, 60) : "",
      })),
      keyMatch: templateBlocks.length
        ? {
            expectedBlockIds: templateBlocks.map((b) => b.blockId),
            parsedKeys: Array.isArray(parsed) ? Object.keys(parsed[0] || {}) : Object.keys(parsed || {}),
          }
        : null,
    });

    const blocksSnapshot = templateBlocksArray.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
      required: b.required || false,
      configJson: b.configJson,
    }));
    const audioBlock = blocksSnapshot.find(isAudioBlock);

    const getContentKey = (vals) => {
      const mainVal = mainBlockId ? vals.find((v) => v.blockId === mainBlockId) : null;
      const subVal = subBlockId ? vals.find((v) => v.blockId === subBlockId) : null;
      const mainText = (mainVal?.text != null ? String(mainVal.text).trim() : "") || "";
      const subText = (subVal?.text != null ? String(subVal.text).trim() : "") || "";
      return normalizeContentKey(`${mainText}\n${subText}`);
    };

    const contentKeys = new Set(existingContentKeys);
    const cards = [];
    for (let i = 0; i < generatedCards.length; i++) {
      let values = [...generatedCards[i]];

      if (i === 0) {
        console.log("[mobile add-with-ai] first card payload", {
          valuesCount: values.length,
          values: values.map((v) => ({ blockId: v.blockId, type: v.type, textLen: v.text?.length, hasMedia: !!v.mediaIds?.length })),
        });
      }

      const contentKey = getContentKey(values);
      if (contentKeys.has(contentKey)) continue;
      if (!contentKey) continue;
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
            const { defaultVoiceId: voiceId } = parseAudioBlockConfig(audioBlock.configJson);
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

      cards.push({
        templateId,
        blocksSnapshot,
        values,
        mainBlockId,
        subBlockId,
      });
    }

    return NextResponse.json({ cards });
  } catch (err) {
    console.error("[mobile add-with-ai]", err);
    return NextResponse.json(
      { error: "Failed to add cards", message: err?.message },
      { status: 500 }
    );
  }
}
