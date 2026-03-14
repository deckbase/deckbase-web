import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCardPromptFromContent } from "@/lib/card-ai-prompt";
import { extractText, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/file-to-text";
import { BlockTypeNames } from "@/utils/firestore";
import { getAdminAuth } from "@/utils/firebase-admin";
import { getTemplateAdmin } from "@/lib/firestore-admin";
import { isProOrVip } from "@/lib/revenuecat-server";

function normalizeBlockType(type) {
  if (type == null) return "text";
  if (typeof type === "number" && BlockTypeNames[type] != null) return BlockTypeNames[type];
  return String(type);
}

function parseCardFromParsed(parsed, templateBlocks, normalizeBlockTypeFn) {
  const values = [];
  for (const block of templateBlocks) {
    const type = normalizeBlockTypeFn(block.type);
    if (!["header1", "header2", "header3", "text", "example", "hiddenText", "audio"].includes(type))
      continue;
    const text = parsed[block.blockId] != null ? String(parsed[block.blockId]).trim() : "";
    values.push({ blockId: block.blockId, type, text: text || "" });
  }
  return values;
}

/**
 * POST /api/cards/file-to-ai
 * multipart/form-data: file, deckId, templateId, uid, maxCards?
 * Returns { cards: [ values[], ... ], fileName?, _devPrompt? }
 */
export async function POST(request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
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
      let uid;
      try {
        const decoded = await auth.verifyIdToken(idToken);
        uid = decoded.uid;
      } catch {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
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

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    const deckId = formData.get("deckId")?.toString()?.trim();
    const templateId = formData.get("templateId")?.toString()?.trim();
    const uid = formData.get("uid")?.toString()?.trim();
    const maxCards = Math.min(30, Math.max(1, Number(formData.get("maxCards")) || 15));

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }
    if (!templateId || !uid) {
      return NextResponse.json(
        { error: "templateId and uid are required" },
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

    const mimeType = file.type || "";
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX, or XLSX." },
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

    const templateBlocks = template.blocks
      .map((b) => ({ blockId: b.blockId, type: b.type, label: b.label ?? "" }))
      .filter((b) => b.blockId);

    if (templateBlocks.length === 0) {
      return NextResponse.json(
        { error: "Template has no valid blocks" },
        { status: 400 }
      );
    }

    const { system, user } = buildCardPromptFromContent({
      extractedContent: extracted.text,
      templateBlocks,
      maxCards,
      deckTitle: template.title ?? "",
    });

    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
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
    for (let i = 0; i < arr.length && cards.length < maxCards; i++) {
      const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
      const values = parseCardFromParsed(item, templateBlocks, normalizeBlockType);
      if (values.some((v) => v.text.trim())) {
        cards.push(values);
      }
    }

    const payload = { cards, fileName: file.name ?? "file" };
    if (process.env.NODE_ENV === "development") {
      payload._devPrompt = { system, user };
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
