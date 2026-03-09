import { NextResponse } from "next/server";
import {
  isAvailable as isAdminAvailable,
  getDeckAdmin,
  createCardAdmin,
} from "@/lib/firestore-admin";

/**
 * POST /api/mobile/cards/add
 * Auth: X-API-Key: <DECKBASE_API_KEY> (same as add-with-ai).
 * Body: { uid: string, deckId: string, cards: [{ templateId, blocksSnapshot, values, mainBlockId?, subBlockId? }] }
 * Creates the given cards in the deck. Use after add-with-ai when the user confirms which cards to add.
 * Returns: { created: number, cardIds: string[] }
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
    const uid = typeof body.uid === "string" ? body.uid.trim() : "";
    const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
    const rawCards = Array.isArray(body.cards) ? body.cards : [];

    if (!uid || !deckId) {
      return NextResponse.json(
        { error: "uid and deckId are required" },
        { status: 400 }
      );
    }
    if (rawCards.length === 0) {
      return NextResponse.json(
        { error: "cards array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!isAdminAvailable()) {
      return NextResponse.json(
        { error: "Server storage not configured" },
        { status: 503 }
      );
    }

    const deck = await getDeckAdmin(uid, deckId);
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const cardIds = [];
    for (let i = 0; i < rawCards.length; i++) {
      const c = rawCards[i];
      if (!c || typeof c !== "object") continue;
      const templateId = typeof c.templateId === "string" ? c.templateId.trim() : "";
      const blocksSnapshot = Array.isArray(c.blocksSnapshot) ? c.blocksSnapshot : [];
      const values = Array.isArray(c.values) ? c.values : [];
      const mainBlockId = c.mainBlockId ?? null;
      const subBlockId = c.subBlockId ?? null;
      if (!templateId) continue;

      const { cardId } = await createCardAdmin(
        uid,
        deckId,
        templateId,
        blocksSnapshot,
        values,
        mainBlockId,
        subBlockId
      );
      cardIds.push(cardId);
    }

    return NextResponse.json({
      created: cardIds.length,
      cardIds,
    });
  } catch (err) {
    console.error("[mobile cards add]", err);
    return NextResponse.json(
      { error: "Failed to add cards", message: err?.message },
      { status: 500 }
    );
  }
}
