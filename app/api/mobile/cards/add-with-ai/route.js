import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCardPrompt } from "@/lib/card-ai-prompt";
import { parseGeneratedCard } from "@/lib/ai-card-parse";
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
import {
  checkAIGenerationLimit,
  checkTTSLimit,
  incrementAIGenerations,
  incrementTTSChars,
} from "@/lib/usage-limits";

function normalizeBlockType(type) {
  if (type == null) return "text";
  if (typeof type === "number" && BlockTypeNames[type] != null) return BlockTypeNames[type];
  if (typeof type === "string" && /^\d+$/.test(type)) {
    const n = parseInt(type, 10);
    if (BlockTypeNames[n] != null) return BlockTypeNames[n];
  }
  return String(type);
}

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
  return typeof configJson === "object" ? configJson : {};
}

function isQuizType(type) {
  const t = normalizeBlockType(type);
  return t === "quizSingleSelect" || t === "quizMultiSelect" || t === "quizTextAnswer";
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
      const limitCheck = await checkAIGenerationLimit(uid);
      if (!limitCheck.allowed || limitCheck.used + count > limitCheck.limit) {
        return NextResponse.json(
          { error: limitCheck.message || "Monthly AI generation limit reached" },
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

    const hasQuiz = templateBlocksArray.some((b) => isQuizType(b.type));
    const maxTokens = count > 1 ? (hasQuiz ? 4096 : 2048) : hasQuiz ? 2048 : 1024;

    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
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

    const templateFull = templateBlocksArray.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
      required: Boolean(b.required),
      configJson: b.configJson,
    }));

    const generatedCards = [];
    if (count > 1) {
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (let i = 0; i < count && i < arr.length; i++) {
        const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
        generatedCards.push(parseGeneratedCard(item, templateFull, normalizeBlockType));
      }
    } else {
      const item =
        Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object"
          ? parsed[0]
          : parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
      generatedCards.push(parseGeneratedCard(item, templateFull, normalizeBlockType));
    }

    console.log("[mobile add-with-ai] parseGeneratedCard result", {
      generatedCardsCount: generatedCards.length,
      firstCardValues: generatedCards[0]?.values?.map((v) => ({
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

    const getContentKey = (vals, snap) => {
      const mainBlock = mainBlockId ? snap.find((b) => b.blockId === mainBlockId) : null;
      const subBlock = subBlockId ? snap.find((b) => b.blockId === subBlockId) : null;
      let mainText = "";
      let subText = "";
      if (mainBlockId) {
        if (mainBlock && isQuizType(mainBlock.type)) {
          mainText = String(parseConfigJson(mainBlock.configJson).question || "").trim();
        } else {
          const mainVal = vals.find((v) => v.blockId === mainBlockId);
          mainText = (mainVal?.text != null ? String(mainVal.text).trim() : "") || "";
        }
      }
      if (subBlockId) {
        if (subBlock && isQuizType(subBlock.type)) {
          subText = String(parseConfigJson(subBlock.configJson).question || "").trim();
        } else {
          const subVal = vals.find((v) => v.blockId === subBlockId);
          subText = (subVal?.text != null ? String(subVal.text).trim() : "") || "";
        }
      }
      return normalizeContentKey(`${mainText}\n${subText}`);
    };

    const contentKeys = new Set(existingContentKeys);
    const cards = [];
    for (let i = 0; i < generatedCards.length; i++) {
      const { values: vals0, blocksSnapshot: snap0 } = generatedCards[i];
      let values = [...vals0];
      const blocksSnapshot = snap0.map((b) => ({ ...b }));

      const audioBlock = blocksSnapshot.find(isAudioBlock);

      if (i === 0) {
        console.log("[mobile add-with-ai] first card payload", {
          valuesCount: values.length,
          values: values.map((v) => ({ blockId: v.blockId, type: v.type, textLen: v.text?.length, hasMedia: !!v.mediaIds?.length })),
        });
      }

      const contentKey = getContentKey(values, blocksSnapshot);
      if (contentKeys.has(contentKey)) continue;
      if (!contentKey) continue;
      contentKeys.add(contentKey);

      if (audioBlock) {
        let mainText = "";
        if (mainBlockId) {
          const mainMeta = blocksSnapshot.find((b) => b.blockId === mainBlockId);
          if (mainMeta && isQuizType(mainMeta.type)) {
            mainText = String(parseConfigJson(mainMeta.configJson).question || "").trim();
          } else {
            const mainVal = values.find((v) => v.blockId === mainBlockId);
            mainText = (mainVal?.text != null ? String(mainVal.text) : "").trim();
          }
        }
        if (!mainText) {
          const first = values.find((v) => String(v?.text || "").trim());
          mainText = first ? String(first.text).trim() : "";
        }
        if (mainText) {
          try {
            if (process.env.NODE_ENV === "production") {
              const ttsCheck = await checkTTSLimit(uid, mainText.length);
              if (!ttsCheck.allowed) {
                console.warn("[mobile add-with-ai] TTS limit reached, skipping TTS for card", i);
              } else {
                const { defaultVoiceId: voiceId } = parseAudioBlockConfig(audioBlock.configJson);
                const buffer = await generateTTS({ text: mainText, voiceId });
                if (buffer) {
                  incrementTTSChars(uid, mainText.length).catch((e) =>
                    console.warn("[mobile add-with-ai] TTS usage increment failed", e?.message)
                  );
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
              }
            } else {
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
        mainBlockId: template.mainBlockId || null,
        subBlockId: template.subBlockId || null,
      });
    }

    if (process.env.NODE_ENV === "production" && uid && cards.length > 0) {
      incrementAIGenerations(uid, cards.length).catch((err) =>
        console.warn("[mobile add-with-ai] usage increment failed", err?.message)
      );
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
