import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCardPrompt } from "@/lib/card-ai-prompt";
import { parseGeneratedCard } from "@/lib/ai-card-parse";
import { BlockTypeNames } from "@/utils/firestore";
import { getAdminAuth } from "@/utils/firebase-admin";
import { isProOrVip } from "@/lib/revenuecat-server";
import { checkAIGenerationLimit, incrementAIGenerations } from "@/lib/usage-limits";

function normalizeBlockType(type) {
  if (type == null) return "text";
  if (typeof type === "number" && BlockTypeNames[type] != null) return BlockTypeNames[type];
  if (typeof type === "string" && /^\d+$/.test(type)) {
    const n = parseInt(type, 10);
    if (BlockTypeNames[n] != null) return BlockTypeNames[n];
  }
  return String(type);
}

function templateBlocksToFull(templateBlocks) {
  return templateBlocks.map((b) => ({
    blockId: b.blockId,
    type: b.type,
    label: b.label || "",
    required: Boolean(b.required),
    configJson: b.configJson,
  }));
}

/**
 * POST /api/cards/generate-with-ai
 * Body: { deckTitle, deckDescription?, templateBlocks (include blockId,type,label + optional configJson), ... }
 * Returns: { cards: [{ values, blocksSnapshot }], values? (first card values, compat) }
 */
export async function POST(request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    let requestUid = null;

    if (isProduction) {
      const auth = getAdminAuth();
      const authHeader = request.headers.get("authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!auth || !idToken) {
        return NextResponse.json(
          { error: "Authentication required to use AI in production" },
          { status: 401 }
        );
      }
      try {
        const decoded = await auth.verifyIdToken(idToken);
        requestUid = decoded.uid;
      } catch {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }
      const entitled = await isProOrVip(requestUid);
      if (!entitled) {
        return NextResponse.json(
          { error: "Active subscription required to use AI features" },
          { status: 403 }
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const count = Math.min(5, Math.max(1, Number(body.count) || 1));
    if (isProduction && requestUid) {
      const limitCheck = await checkAIGenerationLimit(requestUid);
      if (!limitCheck.allowed || limitCheck.used + count > limitCheck.limit) {
        return NextResponse.json(
          { error: limitCheck.message || "Monthly AI generation limit reached" },
          { status: 403 }
        );
      }
    }

    const deckTitle = typeof body.deckTitle === "string" ? body.deckTitle.trim() : "";
    if (!deckTitle) {
      return NextResponse.json(
        { error: "deckTitle is required" },
        { status: 400 }
      );
    }
    const deckDescription =
      typeof body.deckDescription === "string" ? body.deckDescription.trim() : "";
    const templateBlocks = Array.isArray(body.templateBlocks) ? body.templateBlocks : [];
    const exampleCards = Array.isArray(body.exampleCards) ? body.exampleCards : [];
    const mainBlockId = body.mainBlockId ?? null;
    const subBlockId = body.subBlockId ?? null;
    const mainBlockLabel = typeof body.mainBlockLabel === "string" ? body.mainBlockLabel.trim() : null;
    const subBlockLabel = typeof body.subBlockLabel === "string" ? body.subBlockLabel.trim() : null;
    const avoidMainPhrases = Array.isArray(body.avoidMainPhrases)
      ? body.avoidMainPhrases.map((s) => (s != null ? String(s).trim() : "")).filter(Boolean)
      : [];
    const exampleCardsLabel =
      typeof body.exampleCardsLabel === "string" && body.exampleCardsLabel.trim()
        ? body.exampleCardsLabel.trim()
        : "Example cards from this deck:";

    if (templateBlocks.length === 0) {
      return NextResponse.json(
        { error: "templateBlocks is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    const blockSummary = templateBlocks.map((b) => ({
      blockId: String(b.blockId).slice(0, 8),
      type: b.type,
      typeOf: typeof b.type,
      label: (b.label || "").slice(0, 20),
    }));
    console.log("[generate-with-ai] request", {
      deckTitle: deckTitle?.slice(0, 40),
      templateBlocksCount: templateBlocks.length,
      blocks: blockSummary,
      exampleCardsCount: exampleCards.length,
      count,
      mainBlockId: mainBlockId ?? null,
      subBlockId: subBlockId ?? null,
    });

    const promptBlocks = templateBlocks.map((b) => ({
      blockId: b.blockId,
      type: normalizeBlockType(b.type),
      label: b.label || "",
    }));
    console.log("[generate-with-ai] promptBlocks (normalized types)", promptBlocks.map((b) => ({ id: b.blockId?.slice(0, 8), type: b.type, label: (b.label || "").slice(0, 20) })));

    const { system, user } = buildCardPrompt({
      deckTitle,
      deckDescription,
      templateBlocks: promptBlocks,
      exampleCards,
      count,
      mainBlockId,
      subBlockId,
      mainBlockLabel,
      subBlockLabel,
      avoidMainPhrases,
      exampleCardsLabel,
    });

    const templateFull = templateBlocksToFull(templateBlocks);
    const hasQuiz = templateFull.some((b) => {
      const t = normalizeBlockType(b.type);
      return (
        t === "quizSingleSelect" ||
        t === "quizMultiSelect" ||
        t === "quizTextAnswer"
      );
    });
    console.log("[generate-with-ai] prompt", {
      hasQuiz,
      maxTokens: count > 1 ? (hasQuiz ? 4096 : 2048) : hasQuiz ? 2048 : 1024,
      systemIncludesQuiz: (system || "").includes("quiz") || (system || "").includes("object"),
    });
    const maxTokens =
      count > 1 ? (hasQuiz ? 4096 : 2048) : hasQuiz ? 2048 : 1024;

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
      console.error("[generate-with-ai] JSON parse failed", e.message, jsonStr?.slice(0, 200));
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: jsonStr?.slice(0, 300) },
        { status: 502 }
      );
    }

    const expectedIds = templateFull.map((b) => b.blockId);
    const firstObj = Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object" ? parsed[0] : parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const parsedKeys = Object.keys(firstObj);
    console.log("[generate-with-ai] AI response", {
      parsedKeysCount: parsedKeys.length,
      expectedBlockIdsCount: expectedIds.length,
      missingKeys: expectedIds.filter((id) => firstObj[id] == null),
    });

    const cards = [];
    if (count > 1) {
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (let i = 0; i < count && i < arr.length; i++) {
        const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
        cards.push(parseGeneratedCard(item, templateFull, normalizeBlockType));
      }
    } else {
      const item =
        Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object"
          ? parsed[0]
          : parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
      cards.push(parseGeneratedCard(item, templateFull, normalizeBlockType));
    }

    console.log("[generate-with-ai] parsed cards", {
      cardsCount: cards.length,
      firstCardValuesCount: cards[0]?.values?.length ?? 0,
      firstCardBlocksSnapshotCount: cards[0]?.blocksSnapshot?.length ?? 0,
    });

    if (requestUid && cards.length > 0) {
      incrementAIGenerations(requestUid, cards.length).catch((err) =>
        console.warn("[generate-with-ai] usage increment failed", err?.message)
      );
    }

    const payload = { cards };
    if (count === 1) payload.values = cards[0].values;
    if (process.env.NODE_ENV === "development") {
      payload._devPrompt = { system, user };
    }
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[generate-with-ai]", err);
    return NextResponse.json(
      { error: "Generation failed", message: err?.message },
      { status: 500 }
    );
  }
}
