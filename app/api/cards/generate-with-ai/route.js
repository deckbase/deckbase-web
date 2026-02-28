import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCardPrompt } from "@/lib/card-ai-prompt";
import { BlockTypeNames } from "@/utils/firestore";
import { getAdminAuth } from "@/utils/firebase-admin";
import { isProOrVip } from "@/lib/revenuecat-server";

function normalizeBlockType(type) {
  if (type == null) return "text";
  if (typeof type === "number" && BlockTypeNames[type] != null) return BlockTypeNames[type];
  return String(type);
}

/**
 * POST /api/cards/generate-with-ai
 * Body: { deckTitle, deckDescription?, templateBlocks, exampleCards, count?: 1-5 }
 * Returns: { cards: [{ values }] } or (count=1) { values } for backward compat; also cards array when count>1
 */
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

export async function POST(request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";

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
      let uid;
      try {
        const decoded = await auth.verifyIdToken(idToken);
        uid = decoded.uid;
      } catch {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }
      const entitled = await isProOrVip(uid);
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
    const count = Math.min(5, Math.max(1, Number(body.count) || 1));
    const mainBlockId = body.mainBlockId ?? null;
    const subBlockId = body.subBlockId ?? null;
    const mainBlockLabel = typeof body.mainBlockLabel === "string" ? body.mainBlockLabel.trim() : null;
    const subBlockLabel = typeof body.subBlockLabel === "string" ? body.subBlockLabel.trim() : null;
    const avoidMainPhrases = Array.isArray(body.avoidMainPhrases)
      ? body.avoidMainPhrases.map((s) => (s != null ? String(s).trim() : "")).filter(Boolean)
      : [];

    if (templateBlocks.length === 0) {
      return NextResponse.json(
        { error: "templateBlocks is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    const { system, user } = buildCardPrompt({
      deckTitle,
      deckDescription,
      templateBlocks,
      exampleCards,
      count,
      mainBlockId,
      subBlockId,
      mainBlockLabel,
      subBlockLabel,
      avoidMainPhrases,
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
      console.error("[generate-with-ai] JSON parse failed", e.message, jsonStr?.slice(0, 200));
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: jsonStr?.slice(0, 300) },
        { status: 502 }
      );
    }

    const cards = [];
    if (count > 1) {
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (let i = 0; i < count && i < arr.length; i++) {
        const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
        cards.push(parseCardFromParsed(item, templateBlocks, normalizeBlockType));
      }
    } else {
      const values = parseCardFromParsed(parsed, templateBlocks, normalizeBlockType);
      cards.push(values);
    }

    const payload = { cards };
    if (count === 1) payload.values = cards[0];
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
