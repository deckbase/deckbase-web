import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildImportQuizAudioPrompt } from "@/lib/card-ai-prompt";
import { parseGeneratedCard, generatedCardHasContent } from "@/lib/ai-card-parse";
import { BlockTypeNames } from "@/utils/firestore";
import { getAdminAuth } from "@/utils/firebase-admin";
import { getTemplateAdmin } from "@/lib/firestore-admin";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";
import { checkAIGenerationLimit, incrementAIGenerations } from "@/lib/usage-limits";

const MAX_EXTRACTED_CHARS = 50000;

// Allow up to 60s for Claude API (avoids platform timeout → 530 when no JSON body is sent)
export const maxDuration = 60;

function normalizeBlockType(type) {
  if (type == null) return "text";
  if (typeof type === "number" && BlockTypeNames[type] != null) return BlockTypeNames[type];
  if (typeof type === "string" && /^\d+$/.test(type)) {
    const n = parseInt(type, 10);
    if (BlockTypeNames[n] != null) return BlockTypeNames[n];
  }
  return String(type);
}

function isQuizBlock(block, normalizeFn) {
  const t = normalizeFn(block.type);
  return t === "quizSingleSelect" || t === "quizMultiSelect" || t === "quizTextAnswer";
}

function logRequest(step, detail = "") {
  const ts = new Date().toISOString();
  console.log(`[import-ai-blocks] ${ts} ${step}${detail ? ` ${detail}` : ""}`);
}

/**
 * POST /api/cards/import-ai-blocks
 * Body (JSON): extractedContent, deckId, templateId, uid, maxCards, blockIds (string[] — quiz block IDs only)
 * Returns { cards: [{ values, blocksSnapshot }] } — quiz only per row.
 * Claude generates quiz only. Audio "Use AI" uses row main text (no Claude); TTS later.
 */
export async function POST(request) {
  logRequest("start");
  try {
    const isProduction = process.env.NODE_ENV === "production";
    let tokenUid = null;
    if (isProduction) {
      const auth = getAdminAuth();
      const authHeader = request.headers.get("authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!auth || !idToken) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      try {
        const decoded = await auth.verifyIdToken(idToken);
        tokenUid = decoded.uid;
      } catch {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
      const entitled = await isBasicOrProOrVip(tokenUid);
      if (!entitled) {
        return NextResponse.json(
          { error: "Active subscription required to use AI features" },
          { status: 403 }
        );
      }
      logRequest("auth", `uid=${tokenUid}`);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const uid = body.uid?.toString()?.trim() || "";
    const templateId = body.templateId?.toString()?.trim() || "";
    const deckId = body.deckId?.toString()?.trim() || "";
    const extractedContent = body.extractedContent;
    const maxCards = Math.min(30, Math.max(1, Number(body.maxCards) || 15));
    const blockIds = Array.isArray(body.blockIds) ? body.blockIds.map((id) => String(id).trim()).filter(Boolean) : [];

    if (isProduction && uid && tokenUid && uid !== tokenUid) {
      return NextResponse.json(
        { error: "User id does not match signed-in user" },
        { status: 403 }
      );
    }
    if (!extractedContent || typeof extractedContent !== "string") {
      return NextResponse.json(
        { error: "extractedContent is required" },
        { status: 400 }
      );
    }
    if (!templateId || !uid) {
      return NextResponse.json(
        { error: "templateId and uid are required" },
        { status: 400 }
      );
    }
    if (blockIds.length === 0) {
      return NextResponse.json(
        { error: "blockIds must be a non-empty array (quiz/audio block IDs to generate)" },
        { status: 400 }
      );
    }

    const template = await getTemplateAdmin(uid, templateId);
    if (!template?.blocks?.length) {
      logRequest("template_missing", `uid=${uid} templateId=${templateId}`);
      return NextResponse.json(
        { error: "Template not found or has no blocks" },
        { status: 404 }
      );
    }
    logRequest("template_ok", `templateId=${templateId} blocks=${template.blocks?.length}`);

    const normalizeFn = normalizeBlockType;
    const fullBlocks = template.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
      required: Boolean(b.required),
      configJson: b.configJson,
    }));
    const blockIdSet = new Set(blockIds);
    const filteredFull = fullBlocks.filter(
      (b) => blockIdSet.has(b.blockId) && isQuizBlock(b, normalizeFn)
    );
    if (filteredFull.length === 0) {
      return NextResponse.json(
        { error: "blockIds must reference quiz blocks only in the template (Claude generates quiz only)" },
        { status: 400 }
      );
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

    const templateBlocksForPrompt = filteredFull.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label,
    }));
    const text = (extractedContent || "").trim().slice(0, MAX_EXTRACTED_CHARS);
    if (!text) {
      return NextResponse.json(
        { error: "No content to generate from" },
        { status: 422 }
      );
    }

    const { system, user } = buildImportQuizAudioPrompt({
      extractedContent: text,
      templateBlocks: templateBlocksForPrompt,
      maxCards,
      deckTitle: template.title ?? "",
    });

    const hasQuiz = filteredFull.some((b) => {
      const t = normalizeFn(b.type);
      return t === "quizSingleSelect" || t === "quizMultiSelect" || t === "quizTextAnswer";
    });
    logRequest("claude_call", `maxCards=${maxCards} hasQuiz=${hasQuiz}`);
    let msg;
    try {
      const anthropic = new Anthropic({ apiKey });
      msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: hasQuiz ? 8192 : 4096,
        system,
        messages: [{ role: "user", content: user }],
      });
    } catch (claudeErr) {
      const message = claudeErr?.message ?? String(claudeErr);
      const status = message.includes("rate") || message.includes("overloaded")
        ? 503
        : 502;
      console.error("[import-ai-blocks] Claude API error", status, message);
      return NextResponse.json(
        { error: status === 503 ? "AI service is busy. Please try again later." : "AI request failed. Please try again." },
        { status }
      );
    }
    logRequest("claude_done");

    const rawText = msg.content?.find((c) => c.type === "text")?.text?.trim() ?? "[]";
    const jsonStr = rawText.replace(/```json?\s*|\s*```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[import-ai-blocks] JSON parse failed", e.message, jsonStr?.slice(0, 200));
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 502 }
      );
    }

    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const cards = [];
    for (let i = 0; i < arr.length && cards.length < maxCards; i++) {
      const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
      const { values, blocksSnapshot } = parseGeneratedCard(item, filteredFull, normalizeFn);
      if (generatedCardHasContent(values, blocksSnapshot, normalizeFn)) {
        cards.push({
          templateId: template.templateId ?? null,
          blocksSnapshot,
          values,
          mainBlockId: template.mainBlockId ?? null,
          subBlockId: template.subBlockId ?? null,
        });
      }
    }

    if (effectiveUid && cards.length > 0) {
      incrementAIGenerations(effectiveUid, cards.length).catch((err) =>
        console.warn("[import-ai-blocks] usage increment failed", err?.message)
      );
    }

    const payload = { cards };
    if (process.env.NODE_ENV === "development") {
      payload._devPrompt = { system, user };
    }
    return NextResponse.json(payload);
  } catch (err) {
    const message = err?.message ?? String(err);
    console.error("[import-ai-blocks] error", message, err?.stack);
    return NextResponse.json(
      { error: message || "Import AI blocks failed" },
      { status: 500 }
    );
  }
}
