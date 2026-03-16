import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildCardPromptFromContent,
  buildCardPromptFromImage,
} from "@/lib/card-ai-prompt";
import { parseGeneratedCard, generatedCardHasContent } from "@/lib/ai-card-parse";
import {
  extractText,
  AI_FROM_FILE_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/file-to-text";
import { BlockTypeNames } from "@/utils/firestore";
import { getAdminAuth } from "@/utils/firebase-admin";
import { getTemplateAdmin } from "@/lib/firestore-admin";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";
import { checkAIGenerationLimit, incrementAIGenerations } from "@/lib/usage-limits";

const MAX_EXTRACTED_CHARS = 50000;

function normalizeBlockType(type) {
  if (type == null) return "text";
  if (typeof type === "number" && BlockTypeNames[type] != null) return BlockTypeNames[type];
  if (typeof type === "string" && /^\d+$/.test(type)) {
    const n = parseInt(type, 10);
    if (BlockTypeNames[n] != null) return BlockTypeNames[n];
  }
  return String(type);
}

async function runFileToAiWithContent({
  extractedContent,
  template,
  maxCards,
  apiKey,
  templateBlocks,
  templateFull,
  normalizeBlockTypeFn,
}) {
  const text = (extractedContent || "").trim().slice(0, MAX_EXTRACTED_CHARS);
  if (!text) {
    return NextResponse.json(
      { error: "No content to generate cards from" },
      { status: 422 }
    );
  }
  const { system, user } = buildCardPromptFromContent({
    extractedContent: text,
    templateBlocks,
    maxCards,
    deckTitle: template.title ?? "",
  });
  const hasQuiz = templateFull.some((b) => {
    const t = normalizeBlockTypeFn(b.type);
    return (
      t === "quizSingleSelect" ||
      t === "quizMultiSelect" ||
      t === "quizTextAnswer"
    );
  });
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: hasQuiz ? 8192 : 4096,
    system,
    messages: [{ role: "user", content: user }],
  });
  const rawText = msg.content?.find((c) => c.type === "text")?.text?.trim() ?? "[]";
  const jsonStr = rawText.replace(/```json?\s*|\s*```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error("[file-to-ai] JSON parse failed", e.message, jsonStr?.slice(0, 200));
    return NextResponse.json(
      { error: "AI returned invalid JSON" },
      { status: 502 }
    );
  }
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const cards = [];
  const templateQuizBlockIds = (templateFull || [])
    .filter((b) => {
      const t = normalizeBlockTypeFn(b.type);
      return t === "quizSingleSelect" || t === "quizMultiSelect" || t === "quizTextAnswer";
    })
    .map((b) => b.blockId);
  const firstItem = arr[0] && typeof arr[0] === "object" ? arr[0] : {};
  const firstItemKeys = Object.keys(firstItem);
  const quizRawInFirstItem = {};
  templateQuizBlockIds.forEach((bid) => {
    const raw = firstItem[bid];
    quizRawInFirstItem[bid] =
      raw == null
        ? "(missing)"
        : typeof raw === "object"
          ? `object keys: ${Object.keys(raw || {}).join(",")}`
          : `typeof ${typeof raw}`;
  });
  console.log("[file-to-ai] runFileToAiWithContent", {
    arrLength: arr.length,
    templateQuizBlockIds,
    firstItemKeys,
    quizRawInFirstItem,
  });
  for (let i = 0; i < arr.length && cards.length < maxCards; i++) {
    const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
    const { values, blocksSnapshot } = parseGeneratedCard(
      item,
      templateFull,
      normalizeBlockTypeFn
    );
    if (i === 0) {
      const quizSnap = (blocksSnapshot || []).filter((b) =>
        templateQuizBlockIds.includes(b.blockId)
      );
      console.log("[file-to-ai] first card parseGeneratedCard", {
        valuesLength: values?.length,
        blocksSnapshotLength: blocksSnapshot?.length,
        quizBlocksInSnapshot: quizSnap.map((b) => ({
          blockId: b.blockId,
          configJsonPreview:
            typeof b.configJson === "string"
              ? b.configJson.slice(0, 100)
              : b.configJson
                ? JSON.stringify(b.configJson).slice(0, 100)
                : "(none)",
        })),
        hasContent: generatedCardHasContent(values, blocksSnapshot, normalizeBlockTypeFn),
      });
    }
    if (generatedCardHasContent(values, blocksSnapshot, normalizeBlockTypeFn)) {
      cards.push({
        templateId: template.templateId ?? null,
        blocksSnapshot,
        values,
        mainBlockId: template.mainBlockId ?? null,
        subBlockId: template.subBlockId ?? null,
      });
    }
  }
  console.log("[file-to-ai] runFileToAiWithContent result", { cardsCount: cards.length });
  return { cards };
}

function anthropicImageMediaType(mime) {
  const m = (mime || "").toLowerCase();
  if (m === "image/png") return "image/png";
  if (m === "image/webp") return "image/webp";
  if (m === "image/jpeg" || m === "image/jpg") return "image/jpeg";
  return "image/jpeg";
}

/**
 * POST /api/cards/file-to-ai
 * - multipart/form-data: file, deckId, templateId, uid, maxCards?
 * - application/json: extractedContent, deckId, templateId, uid, maxCards?, fileName? (for apkg parsed in client)
 * Returns { cards: [{ values, blocksSnapshot, templateId?, mainBlockId?, subBlockId? }], fileName?, _devPrompt? }
 */
export async function POST(request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    let tokenUid = null;
    let mobileApiKey = false;
    if (isProduction) {
      const auth = getAdminAuth();
      const authHeader = request.headers.get("authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const apiKeyHeader = request.headers.get("x-api-key")?.trim();
      const expectedApiKey = process.env.DECKBASE_API_KEY?.trim();
      if (auth && idToken) {
        try {
          const decoded = await auth.verifyIdToken(idToken);
          tokenUid = decoded.uid;
        } catch {
          return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }
      } else if (expectedApiKey && apiKeyHeader === expectedApiKey) {
        mobileApiKey = true;
      }
      if (!tokenUid && !mobileApiKey) {
        return NextResponse.json(
          { error: "Authentication required (Bearer token or X-API-Key)" },
          { status: 401 }
        );
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const extractedContent = typeof body.extractedContent === "string" ? body.extractedContent : "";
      const deckId = (body.deckId && String(body.deckId).trim()) || "";
      const templateId = (body.templateId && String(body.templateId).trim()) || "";
      const uid = (body.uid && String(body.uid).trim()) || "";
      const maxCards = Math.min(30, Math.max(1, Number(body.maxCards) || 15));
      const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "file";

      if (mobileApiKey) tokenUid = uid;
      if (isProduction && tokenUid) {
        const entitled = await isBasicOrProOrVip(tokenUid);
        if (!entitled) {
          return NextResponse.json(
            { error: "Active subscription required to use AI features" },
            { status: 403 }
          );
        }
      }
      if (isProduction && uid && tokenUid && uid !== tokenUid) {
        return NextResponse.json(
          { error: "User id does not match signed-in user" },
          { status: 403 }
        );
      }
      if (!deckId || !templateId || !uid) {
        return NextResponse.json(
          { error: "deckId, templateId, and uid are required" },
          { status: 400 }
        );
      }
      if (!extractedContent) {
        return NextResponse.json(
          { error: "extractedContent is required" },
          { status: 400 }
        );
      }

      const template = await getTemplateAdmin(uid, templateId);
      if (!template?.blocks?.length) {
        return NextResponse.json(
          { error: "Template not found or has no blocks" },
          { status: 404 }
        );
      }
      const templateBlocks = template.blocks
        .map((b) => ({ blockId: b.blockId, type: b.type, label: b.label ?? "" }))
        .filter((b) => b.blockId);
      const templateFull = template.blocks.map((b) => ({
        blockId: b.blockId,
        type: b.type,
        label: b.label || "",
        required: Boolean(b.required),
        configJson: b.configJson,
      }));
      if (templateBlocks.length === 0) {
        return NextResponse.json(
          { error: "Template has no valid blocks" },
          { status: 400 }
        );
      }

      const effectiveUidJson = isProduction ? tokenUid || uid : null;
      if (effectiveUidJson) {
        const limitCheck = await checkAIGenerationLimit(effectiveUidJson);
        if (!limitCheck.allowed || limitCheck.used + maxCards > limitCheck.limit) {
          return NextResponse.json(
            { error: limitCheck.message || "Monthly AI generation limit reached" },
            { status: 403 }
          );
        }
      }

      const result = await runFileToAiWithContent({
        extractedContent,
        template,
        maxCards,
        apiKey,
        templateBlocks,
        templateFull,
        normalizeBlockTypeFn: normalizeBlockType,
      });
      if (result instanceof NextResponse) return result;

      if (effectiveUidJson && result.cards?.length > 0) {
        incrementAIGenerations(effectiveUidJson, result.cards.length).catch((err) =>
          console.warn("[file-to-ai] usage increment failed", err?.message)
        );
      }

      const payload = { cards: result.cards, fileName };
      console.log("[file-to-ai] response payload (JSON path)", {
        cardsCount: payload.cards?.length,
        firstCardKeys: payload.cards?.[0] ? Object.keys(payload.cards[0]) : [],
      });
      if (process.env.NODE_ENV === "development") {
        const { system, user } = buildCardPromptFromContent({
          extractedContent: (extractedContent || "").trim().slice(0, MAX_EXTRACTED_CHARS),
          templateBlocks,
          maxCards,
          deckTitle: template.title ?? "",
        });
        payload._devPrompt = { system, user };
      }
      return NextResponse.json(payload);
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    const deckId = formData.get("deckId")?.toString()?.trim() || "";
    const templateId = formData.get("templateId")?.toString()?.trim() || "";
    const uid = formData.get("uid")?.toString()?.trim() || "";
    const maxCards = Math.min(30, Math.max(1, Number(formData.get("maxCards")) || 15));

    if (mobileApiKey) tokenUid = uid;
    if (isProduction && tokenUid) {
      const entitled = await isBasicOrProOrVip(tokenUid);
      if (!entitled) {
        return NextResponse.json(
          { error: "Active subscription required to use AI features" },
          { status: 403 }
        );
      }
    }
    if (isProduction && uid && tokenUid && uid !== tokenUid) {
      return NextResponse.json(
        { error: "User id does not match signed-in user" },
        { status: 403 }
      );
    }
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }
    if (!deckId || !templateId || !uid) {
      return NextResponse.json(
        { error: "deckId, templateId, and uid are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 20 MB)" },
        { status: 413 }
      );
    }

    const mimeType = (file.type || "").toLowerCase().trim();
    if (!AI_FROM_FILE_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX, or image (PNG, JPEG, WebP). For CSV/Excel/Anki use Import from table." },
        { status: 415 }
      );
    }

    const template = await getTemplateAdmin(uid, templateId);
    if (!template?.blocks?.length) {
      return NextResponse.json(
        { error: "Template not found or has no blocks" },
        { status: 404 }
      );
    }

    console.log("[file-to-ai] template.blocks raw", template.blocks?.map((b, i) => ({ i, blockId: b.blockId?.slice(0, 8), type: b.type, typeOf: typeof b.type, label: b.label?.slice(0, 20) })));
    const templateBlocks = template.blocks
      .map((b) => ({ blockId: b.blockId, type: b.type, label: b.label ?? "" }))
      .filter((b) => b.blockId);
    console.log("[file-to-ai] templateBlocks passed to prompt", templateBlocks.map((b) => ({ blockId: b.blockId?.slice(0, 8), type: b.type, typeOf: typeof b.type, label: b.label?.slice(0, 20) })));

    const templateFull = template.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
      required: Boolean(b.required),
      configJson: b.configJson,
    }));

    if (templateBlocks.length === 0) {
      return NextResponse.json(
        { error: "Template has no valid blocks" },
        { status: 400 }
      );
    }

    const previewVal = formData.get("preview");
    const isPreview = previewVal === "true" || previewVal === true || previewVal === "1";
    if (isPreview) {
      const isImage = IMAGE_MIME_TYPES.includes(mimeType);
      console.log("[file-to-ai] preview mode", { previewVal, isPreview, mimeType, isImage, templateId });
      if (isImage) {
        const { system, user } = buildCardPromptFromImage({
          templateBlocks,
          maxCards,
          deckTitle: template.title ?? "",
        });
        console.log("[file-to-ai] preview returning image prompt", { systemLen: system?.length, userLen: user?.length });
        return NextResponse.json({ _devPrompt: { system, user: "[image] " + user } });
      }
      let extracted;
      try {
        extracted = await extractText(buffer, mimeType);
      } catch (e) {
        console.error("[file-to-ai] preview extract failed", e.message);
        return NextResponse.json(
          { error: e.message || "Extraction failed" },
          { status: 422 }
        );
      }
      const text = (extracted.text || "").trim().slice(0, MAX_EXTRACTED_CHARS);
      console.log("[file-to-ai] preview extracted", { textLen: text.length, mimeType });
      const { system, user } = buildCardPromptFromContent({
        extractedContent: text,
        templateBlocks,
        maxCards,
        deckTitle: template.title ?? "",
      });
      console.log("[file-to-ai] preview returning content prompt", { systemLen: system?.length, userLen: user?.length });
      return NextResponse.json({ _devPrompt: { system, user } });
    }

    const effectiveUid = isProduction ? tokenUid || uid : null;
    if (effectiveUid) {
      const limitCheck = await checkAIGenerationLimit(effectiveUid);
      if (!limitCheck.allowed || limitCheck.used + maxCards > limitCheck.limit) {
        return NextResponse.json(
          { error: limitCheck.message || "Monthly AI generation limit reached" },
          { status: 403 }
        );
      }
    }

    const isImage = IMAGE_MIME_TYPES.includes(mimeType);
    let result;
    let extractedTextForDev = null;

    if (isImage) {
      const { system, user } = buildCardPromptFromImage({
        templateBlocks,
        maxCards,
        deckTitle: template.title ?? "",
      });
      const anthropic = new Anthropic({ apiKey });
      const mediaType = anthropicImageMediaType(mimeType);
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: buffer.toString("base64"),
                },
              },
              { type: "text", text: user },
            ],
          },
        ],
      });
      const rawText = msg.content?.find((c) => c.type === "text")?.text?.trim() ?? "[]";
      const jsonStr = rawText.replace(/```json?\s*|\s*```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error("[file-to-ai] JSON parse failed", e.message, jsonStr?.slice(0, 200));
        return NextResponse.json(
          { error: "AI returned invalid JSON" },
          { status: 502 }
        );
      }
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const cards = [];
      for (let i = 0; i < arr.length && cards.length < maxCards; i++) {
        const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
        const { values, blocksSnapshot } = parseGeneratedCard(
          item,
          templateFull,
          normalizeBlockType
        );
        if (generatedCardHasContent(values, blocksSnapshot, normalizeBlockType)) {
          cards.push({
            templateId: template.templateId ?? null,
            blocksSnapshot,
            values,
            mainBlockId: template.mainBlockId ?? null,
            subBlockId: template.subBlockId ?? null,
          });
        }
      }
      result = { cards };
    } else {
      let extracted;
      try {
        extracted = await extractText(buffer, mimeType);
      } catch (e) {
        console.error("[file-to-ai] extract failed", e.message);
        return NextResponse.json(
          { error: e.message || "Extraction failed" },
          { status: 422 }
        );
      }
      extractedTextForDev = (extracted.text || "").trim().slice(0, MAX_EXTRACTED_CHARS);
      result = await runFileToAiWithContent({
        extractedContent: extracted.text,
        template,
        maxCards,
        apiKey,
        templateBlocks,
        templateFull,
        normalizeBlockTypeFn: normalizeBlockType,
      });
      if (result instanceof NextResponse) return result;
    }

    if (effectiveUid && result.cards?.length > 0) {
      incrementAIGenerations(effectiveUid, result.cards.length).catch((err) =>
        console.warn("[file-to-ai] usage increment failed", err?.message)
      );
    }

    const payload = {
      cards: result.cards.map((c) => ({
        ...c,
        templateId: c.templateId ?? template.templateId,
        mainBlockId: c.mainBlockId ?? template.mainBlockId ?? null,
        subBlockId: c.subBlockId ?? template.subBlockId ?? null,
      })),
      fileName: file.name ?? "file",
    };
    console.log("[file-to-ai] response payload", {
      cardsCount: payload.cards?.length,
      firstCardKeys: payload.cards?.[0] ? Object.keys(payload.cards[0]) : [],
      firstCardValuesLen: payload.cards?.[0]?.values?.length,
      firstCardBlocksSnapshotLen: payload.cards?.[0]?.blocksSnapshot?.length,
    });
    if (process.env.NODE_ENV === "development") {
      if (isImage) {
        const { system, user } = buildCardPromptFromImage({
          templateBlocks,
          maxCards,
          deckTitle: template.title ?? "",
        });
        payload._devPrompt = { system, user: "[image] " + user };
      } else {
        const { system, user } = buildCardPromptFromContent({
          extractedContent: extractedTextForDev || "",
          templateBlocks,
          maxCards,
          deckTitle: template.title ?? "",
        });
        payload._devPrompt = { system, user };
      }
    }
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[file-to-ai]", err);
    return NextResponse.json(
      { error: err.message || "File to AI failed" },
      { status: 500 }
    );
  }
}
