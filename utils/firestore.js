import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/utils/firebase";
import { v4 as uuidv4 } from "uuid";
const toMs = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : v ?? Date.now());

// ============== FIRESTORE PATH HELPERS ==============
// Decks, cards, templates live under users/{userId}/decks|cards|templates (flashcards collection abolished)

const getDecksCollection = (uid) =>
  collection(db, "users", uid, "decks");
const getCardsCollection = (uid) =>
  collection(db, "users", uid, "cards");
const getTemplatesCollection = (uid) =>
  collection(db, "users", uid, "templates");
const getMediaCollection = (uid) => collection(db, "users", uid, "media");

// ============== USER PROFILE ==============

const getUserDocRef = (uid) => doc(db, "users", uid);

export const getUserProfile = async (uid) => {
  if (!uid || !db) return null;
  const snap = await getDoc(getUserDocRef(uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid: d.uid,
    email: d.email ?? "",
    displayName: d.displayName ?? "",
    profileUrl: d.profileUrl ?? "",
    created_at: d.created_at,
  };
};

export const updateUserProfile = async (uid, updates) => {
  if (!uid || !db) return;
  const ref = getUserDocRef(uid);
  const payload = {};
  if (updates.displayName !== undefined) payload.displayName = updates.displayName;
  if (updates.profileUrl !== undefined) payload.profileUrl = updates.profileUrl;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(ref, payload);
};

// Wizard data lives under wizard/{uid}/...
const getWizardProgressRef = (uid) =>
  doc(db, "wizard", uid, "progress", "wizard");

// ============== WIZARD PROGRESS (TCG) ==============

const defaultWizardProgress = () => ({
  xp: 0,
  level: 1,
  current_streak: 0,
  last_active_date: null, // YYYY-MM-DD
  rolling_accuracy: 100,
  recent_answers: [], // last 30: true/false
  momentum_score: 50,
  updated_at: Timestamp.now(),
});

export const getWizardProgress = async (uid) => {
  const ref = getWizardProgressRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    return {
      xp: d.xp ?? 0,
      level: d.level ?? 1,
      currentStreak: d.current_streak ?? 0,
      lastActiveDate: d.last_active_date ?? null,
      rollingAccuracy: d.rolling_accuracy ?? 100,
      recentAnswers: Array.isArray(d.recent_answers) ? d.recent_answers : [],
      momentumScore: d.momentum_score ?? 50,
      updatedAt: d.updated_at?.toMillis?.() ?? Date.now(),
    };
  }
  return null;
};

export const setWizardProgress = async (uid, data) => {
  const ref = getWizardProgressRef(uid);
  const payload = {
    xp: data.xp ?? 0,
    level: data.level ?? 1,
    current_streak: data.currentStreak ?? 0,
    last_active_date: data.lastActiveDate ?? null,
    rolling_accuracy: data.rollingAccuracy ?? 100,
    recent_answers: Array.isArray(data.recentAnswers) ? data.recentAnswers : [],
    momentum_score: data.momentumScore ?? 50,
    updated_at: Timestamp.now(),
  };
  await setDoc(ref, payload, { merge: true });
  return payload;
};

export const initWizardProgressIfNeeded = async (uid) => {
  const existing = await getWizardProgress(uid);
  if (existing) return existing;
  const def = defaultWizardProgress();
  await setDoc(getWizardProgressRef(uid), def);
  return {
    xp: 0,
    level: 1,
    currentStreak: 0,
    lastActiveDate: null,
    rollingAccuracy: 100,
    recentAnswers: [],
    momentumScore: 50,
    updatedAt: Date.now(),
  };
};

// ============== WIZARD DECKS (wizard/{uid}/decks — separate from flashcards) ==============

const getWizardDecksCollection = (uid) =>
  collection(db, "wizard", uid, "decks");

/** Subcollection: wizard/{uid}/decks/{wizardDeckId}/entries — doc id = card_id or concept_{id}. */
const getWizardDeckEntriesCollection = (uid, wizardDeckId) =>
  collection(db, "wizard", uid, "decks", wizardDeckId, "entries");

/** wizard/{uid}/concepts — AI-generated concept cards. */
const getWizardConceptsCollection = (uid) =>
  collection(db, "wizard", uid, "concepts");

/** Legacy flat wizard_deck (migrated to users/{uid}/wizard_deck). Used only for migration (read, write to wizard decks). */
const getLegacyWizardDeckCollection = (uid) =>
  collection(db, "users", uid, "wizard_deck");

/**
 * Migrate legacy wizard_deck into a new "Default" wizard deck. Call when user has no wizard_decks.
 * Returns the created default deck id.
 */
async function migrateLegacyWizardDeck(uid) {
  const legacyRef = getLegacyWizardDeckCollection(uid);
  const q = query(legacyRef, orderBy("added_at", "desc"));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const defaultDeckId = uuidv4();
  const now = Timestamp.now();
  await setDoc(doc(getWizardDecksCollection(uid), defaultDeckId), {
    wizard_deck_id: defaultDeckId,
    title: "Default",
    description: "Migrated from your previous Wizard deck.",
    created_at: now,
    source_type: "imported",
  });

  for (const d of snapshot.docs) {
    const data = d.data();
    const entryRef = doc(getWizardDeckEntriesCollection(uid, defaultDeckId), d.id);
    await setDoc(entryRef, {
      card_id: d.id,
      deck_id: data.deck_id ?? null,
      added_at: data.added_at ?? now,
      source_type: data.source_type ?? "import",
    });
  }
  return defaultDeckId;
}

/** List wizard decks. If none exist, migrates legacy wizard_deck and returns at least one. */
export const getWizardDecks = async (uid) => {
  const col = getWizardDecksCollection(uid);
  const snapshot = await getDocs(query(col, orderBy("created_at", "desc")));
  let decks = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      wizardDeckId: d.id,
      title: data.title ?? "Untitled",
      description: data.description ?? "",
      createdAt: data.created_at?.toMillis?.() ?? Date.now(),
      sourceType: data.source_type ?? "created",
    };
  });

  if (decks.length === 0) {
    const defaultId = await migrateLegacyWizardDeck(uid);
    if (defaultId) {
      decks = [{ wizardDeckId: defaultId, title: "Default", description: "Migrated from your previous Wizard deck.", createdAt: Date.now(), sourceType: "imported" }];
    }
  }
  return decks;
};

/** Get one wizard deck by id. */
export const getWizardDeck = async (uid, wizardDeckId) => {
  const ref = doc(getWizardDecksCollection(uid), wizardDeckId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    wizardDeckId: snap.id,
    title: data.title ?? "Untitled",
    description: data.description ?? "",
    createdAt: data.created_at?.toMillis?.() ?? Date.now(),
    sourceType: data.source_type ?? "created",
  };
};

/** Create a new wizard deck (empty). */
export const createWizardDeck = async (uid, title, sourceType = "created", description = "") => {
  const wizardDeckId = uuidv4();
  const now = Timestamp.now();
  const finalTitle = (title || "").trim() || "New Wizard Deck";
  const finalDesc = (description || "").trim();
  await setDoc(doc(getWizardDecksCollection(uid), wizardDeckId), {
    wizard_deck_id: wizardDeckId,
    title: finalTitle,
    description: finalDesc,
    created_at: now,
    source_type: sourceType,
  });
  return { wizardDeckId, title: finalTitle, description: finalDesc, createdAt: now.toMillis(), sourceType };
};

/** Get entries for one wizard deck (card_id or concept_id, deck_id, added_at). */
export const getWizardDeckEntries = async (uid, wizardDeckId) => {
  const q = query(
    getWizardDeckEntriesCollection(uid, wizardDeckId),
    orderBy("added_at", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    const isConcept = d.id.startsWith("concept_");
    return {
      id: d.id,
      cardId: isConcept ? null : d.id,
      conceptId: isConcept ? (data.concept_id ?? d.id.replace(/^concept_/, "")) : null,
      deckId: data.deck_id ?? null,
      addedAt: data.added_at?.toMillis?.() ?? Date.now(),
      sourceType: data.source_type ?? (isConcept ? "concept" : "import"),
      title: data.title ?? null,
      description: data.description ?? null,
    };
  });
};

/** Add a flashcard card to a wizard deck. Optional title/description (from import mapping). */
export const addToWizardDeck = async (uid, wizardDeckId, cardId, deckId, sourceType = "import", extras = {}) => {
  const ref = doc(getWizardDeckEntriesCollection(uid, wizardDeckId), cardId);
  const docData = {
    card_id: cardId,
    deck_id: deckId,
    added_at: Timestamp.now(),
    source_type: sourceType,
  };
  if (extras.title != null) docData.title = extras.title;
  if (extras.description != null) docData.description = extras.description;
  await setDoc(ref, docData);
};

/** Add all cards from a flashcard deck into a wizard deck. */
export const addDeckToWizardDeck = async (uid, wizardDeckId, flashcardDeckId) => {
  const cards = await getCards(uid, flashcardDeckId);
  for (const card of cards) {
    await addToWizardDeck(uid, wizardDeckId, card.cardId, flashcardDeckId, "import");
  }
  return cards.length;
};

/** Create a new card for Wizard only (prompt/answer) and add it to the wizard deck. */
export const createCardForWizard = async (uid, wizardDeckId, prompt, correctAnswer) => {
  const cardId = uuidv4();
  const promptBlockId = uuidv4();
  const answerBlockId = uuidv4();
  const now = Timestamp.now();
  const blocksSnapshot = [
    { blockId: promptBlockId, type: "header1", label: "Question", required: false },
    { blockId: answerBlockId, type: "hiddenText", label: "Answer", required: false },
  ];
  const values = [
    { blockId: promptBlockId, type: "text", text: (prompt || "").trim() || "New card" },
    { blockId: answerBlockId, type: "text", text: (correctAnswer || "").trim() || "" },
  ];
  const blocksSnapshotData = blocksSnapshot.map(transformBlockToFirestore);
  const valuesData = values.map(transformValueToFirestore);
  const card = {
    card_id: cardId,
    deck_id: null,
    template_id: null,
    blocks_snapshot: blocksSnapshotData,
    values: valuesData,
    blocks_snapshot_json: JSON.stringify(blocksSnapshotData),
    values_json: JSON.stringify(valuesData),
    main_block_id: promptBlockId,
    sub_block_id: answerBlockId,
    created_at: now,
    updated_at: now,
    is_deleted: false,
    srs_state: 1,
    srs_step: 0,
    srs_due: Date.now(),
    srs_last_review: null,
    review_count: 0,
  };
  await setDoc(doc(getCardsCollection(uid), cardId), card);
  await addToWizardDeck(uid, wizardDeckId, cardId, null, "created");
  return transformCardFromFirestore(card);
};

/** Add a concept to a wizard deck. */
export const addConceptToWizardDeck = async (uid, wizardDeckId, conceptId) => {
  const entryId = `concept_${conceptId}`;
  const ref = doc(getWizardDeckEntriesCollection(uid, wizardDeckId), entryId);
  await setDoc(ref, {
    concept_id: conceptId,
    card_id: null,
    deck_id: null,
    added_at: Timestamp.now(),
    source_type: "concept",
  });
};

/** Remove a card from a wizard deck. */
export const removeFromWizardDeck = async (uid, wizardDeckId, cardIdOrEntryId) => {
  const ref = doc(getWizardDeckEntriesCollection(uid, wizardDeckId), cardIdOrEntryId);
  await deleteDoc(ref);
};

/** Delete a wizard deck and all its entries. */
export const deleteWizardDeck = async (uid, wizardDeckId) => {
  const entriesCol = getWizardDeckEntriesCollection(uid, wizardDeckId);
  const snapshot = await getDocs(entriesCol);
  for (const d of snapshot.docs) {
    await deleteDoc(doc(entriesCol, d.id));
  }
  await deleteDoc(doc(getWizardDecksCollection(uid), wizardDeckId));
};

/** Update a wizard deck's title and/or description. */
export const updateWizardDeck = async (uid, wizardDeckId, updates) => {
  const ref = doc(getWizardDecksCollection(uid), wizardDeckId);
  const data = {};
  if (updates.title != null) data.title = String(updates.title).trim() || "Untitled";
  if (updates.description != null) data.description = String(updates.description).trim();
  if (Object.keys(data).length === 0) return;
  await updateDoc(ref, data);
};

/** Create an AI-generated concept (wizard/{uid}/concepts/{conceptId}). */
export const createConcept = async (uid, data) => {
  const conceptId = data.conceptId ?? uuidv4();
  const now = Timestamp.now();
  const docData = {
    concept_id: conceptId,
    title: data.title ?? "",
    description: data.description ?? "",
    rarity_score: data.rarityScore ?? 50,
    rarity_tier: data.rarityTier ?? "common",
    card_type: data.cardType ?? "MONSTER",
    atk: data.atk ?? 0,
    def: data.def ?? 0,
    effect_text: data.effectText ?? "",
    trigger_type: data.triggerType ?? "TYPED",
    image_url: data.imageUrl ?? "",
    ai_complexity_score: data.aiComplexityScore ?? null,
    created_at: now,
  };
  await setDoc(doc(getWizardConceptsCollection(uid), conceptId), docData);
  return { conceptId, ...docData, createdAt: now.toMillis() };
};

/** Get one concept by id. */
export const getConcept = async (uid, conceptId) => {
  const ref = doc(getWizardConceptsCollection(uid), conceptId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    conceptId: snap.id,
    title: d.title ?? "",
    description: d.description ?? "",
    rarityScore: d.rarity_score ?? 50,
    rarityTier: d.rarity_tier ?? "common",
    cardType: d.card_type ?? "MONSTER",
    atk: d.atk ?? 0,
    def: d.def ?? 0,
    effectText: d.effect_text ?? "",
    triggerType: d.trigger_type ?? "TYPED",
    imageUrl: d.image_url ?? "",
    aiComplexityScore: d.ai_complexity_score ?? null,
    createdAt: d.created_at?.toMillis?.() ?? Date.now(),
  };
};

/** Get full card/concept list for one wizard deck. Cards are flashcard objects; concepts are normalized for battle. */
export const getWizardDeckCards = async (uid, wizardDeckId) => {
  const entries = await getWizardDeckEntries(uid, wizardDeckId);
  const result = [];
  for (const entry of entries) {
    if (entry.conceptId) {
      const concept = await getConcept(uid, entry.conceptId);
      if (!concept) continue;
      result.push({
        cardId: entry.id,
        isConcept: true,
        concept,
        title: concept.title,
        description: concept.description,
        rarity_tier: concept.rarityTier,
        rarity_score: concept.rarityScore,
        atk: concept.atk,
        def: concept.def,
        effect_text: concept.effectText,
        trigger_type: concept.triggerType,
        prompt: concept.title,
        correctAnswers: concept.description ? [concept.description] : [],
        challengeType: concept.triggerType === "MCQ" ? "mcq" : "text",
      });
    } else if (entry.cardId) {
      const card = await getCard(uid, entry.cardId);
      if (card && !card.isDeleted) {
        card.entryId = entry.id;
        if (entry.title != null) card.title = entry.title;
        if (entry.description != null) card.description = entry.description;
        result.push(card);
      }
    }
  }
  return result;
};

// ============== DECK OPERATIONS ==============

export const createDeck = async (uid, title, description = "") => {
  const deckId = uuidv4();
  const now = Timestamp.now();

  const deck = {
    deck_id: deckId,
    title,
    description,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };

  await setDoc(doc(getDecksCollection(uid), deckId), deck);
  return transformDeckFromFirestore(deck);
};

export const getDecks = async (uid) => {
  const q = query(getDecksCollection(uid), where("is_deleted", "==", false));

  const snapshot = await getDocs(q);
  const decks = snapshot.docs.map((doc) =>
    transformDeckFromFirestore(doc.data()),
  );
  // Sort by updatedAt descending
  decks.sort((a, b) => b.updatedAt - a.updatedAt);
  return decks;
};

export const subscribeToDecks = (uid, callback) => {
  const q = query(getDecksCollection(uid), where("is_deleted", "==", false));

  return onSnapshot(q, (snapshot) => {
    const decks = snapshot.docs.map((doc) =>
      transformDeckFromFirestore(doc.data()),
    );
    // Sort by updatedAt descending
    decks.sort((a, b) => b.updatedAt - a.updatedAt);
    callback(decks);
  });
};

export const getDeck = async (uid, deckId) => {
  const deckRef = doc(getDecksCollection(uid), deckId);
  const deckSnap = await getDoc(deckRef);
  if (deckSnap.exists()) {
    return transformDeckFromFirestore(deckSnap.data());
  }
  return null;
};

export const updateDeck = async (uid, deckId, updates) => {
  const deckRef = doc(getDecksCollection(uid), deckId);
  const updateData = {
    updated_at: Timestamp.now(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.defaultTemplateId !== undefined)
    updateData.default_template_id = updates.defaultTemplateId || null;
  if (updates.isDeleted !== undefined)
    updateData.is_deleted = updates.isDeleted;

  await setDoc(deckRef, updateData, { merge: true });
};

export const deleteDeck = async (uid, deckId) => {
  await updateDeck(uid, deckId, { isDeleted: true });
};

// ============== CARD OPERATIONS ==============

export const createCard = async (
  uid,
  deckId,
  blocksSnapshot,
  values,
  templateId = null,
  mainBlockId = null,
  subBlockId = null,
) => {
  const cardId = uuidv4();
  const now = Timestamp.now();

  const blocksSnapshotData = blocksSnapshot.map(transformBlockToFirestore);
  const valuesData = values.map(transformValueToFirestore);
  const quizBlocksWritten = blocksSnapshotData.filter((b) => isQuizBlockType(b.type));
  if (quizBlocksWritten.length > 0) {
    console.log("[createCard] WRITE quiz blocks count", quizBlocksWritten.length);
    quizBlocksWritten.forEach((b, idx) => {
      console.log("[createCard] WRITE quiz block", idx, {
        block_id: b.block_id,
        type: b.type,
        typeOf: typeof b.type,
        has_config_json: !!b.config_json,
        config_json_full: b.config_json,
        config_json_keys: b.config_json ? Object.keys(b.config_json) : [],
        question: b.config_json?.question,
        options_length: b.config_json?.options?.length,
      });
    });
  }
  const blocksSnapshotJsonStr = JSON.stringify(blocksSnapshotData);
  console.log("[createCard] WRITE cardId", cardId, "blocks_snapshot length", blocksSnapshotData.length, "blocks_snapshot_json length", blocksSnapshotJsonStr.length, "json preview", blocksSnapshotJsonStr.slice(0, 400));
  const card = {
    card_id: cardId,
    deck_id: deckId,
    template_id: templateId,
    blocks_snapshot: blocksSnapshotData,
    values: valuesData,
    blocks_snapshot_json: blocksSnapshotJsonStr,
    values_json: JSON.stringify(valuesData),
    main_block_id: mainBlockId ?? null,
    sub_block_id: subBlockId ?? null,
    created_at: now,
    updated_at: now,
    is_deleted: false,
    // Initialize SRS fields for mobile app
    srs_state: 1, // learning
    srs_step: 0,
    srs_due: Date.now(),
    srs_last_review: null,
    review_count: 0,
  };

  await setDoc(doc(getCardsCollection(uid), cardId), card);

  // Update deck's updatedAt
  await updateDeck(uid, deckId, {});

  return transformCardFromFirestore(card);
};

export const getCards = async (uid, deckId) => {
  const q = query(
    getCardsCollection(uid),
    where("deck_id", "==", deckId),
    where("is_deleted", "==", false),
  );

  const snapshot = await getDocs(q);
  const cards = snapshot.docs.map((doc) =>
    transformCardFromFirestore(doc.data()),
  );
  // Sort by createdAt descending
  cards.sort((a, b) => b.createdAt - a.createdAt);
  return cards;
};

export const getDueCards = async (uid, deckId, limitCount = 50) => {
  const now = Date.now();
  try {
    const q = query(
      getCardsCollection(uid),
      where("deck_id", "==", deckId),
      where("is_deleted", "==", false),
      where("srs_due", "<=", now),
      orderBy("srs_due", "asc"),
      limit(limitCount),
    );

    const snapshot = await getDocs(q);
    const cards = snapshot.docs.map((doc) =>
      transformCardFromFirestore(doc.data()),
    );
    return cards;
  } catch (error) {
    // Fallback when composite index (deck_id, is_deleted, srs_due) is not yet created.
    const allCards = await getCards(uid, deckId);
    return allCards
      .filter((card) => card.srsDue == null || card.srsDue <= now)
      .sort((a, b) => (a.srsDue || 0) - (b.srsDue || 0))
      .slice(0, limitCount);
  }
};

export const subscribeToCards = (uid, deckId, callback) => {
  const q = query(
    getCardsCollection(uid),
    where("deck_id", "==", deckId),
    where("is_deleted", "==", false),
  );

  return onSnapshot(q, (snapshot) => {
    const cards = snapshot.docs.map((doc) =>
      transformCardFromFirestore(doc.data()),
    );
    // Sort by createdAt descending
    cards.sort((a, b) => b.createdAt - a.createdAt);
    callback(cards);
  });
};

export const getCard = async (uid, cardId) => {
  const cardRef = doc(getCardsCollection(uid), cardId);
  const cardSnap = await getDoc(cardRef);
  if (cardSnap.exists()) {
    const raw = cardSnap.data();
    console.log("[getCard] READ cardId", cardId, "has blocks_snapshot_json?", !!raw.blocks_snapshot_json, "blocks_snapshot length", Array.isArray(raw.blocks_snapshot) ? raw.blocks_snapshot.length : 0);
    const transformed = transformCardFromFirestore(raw);
    const quizBlocks = (transformed.blocksSnapshot || []).filter((b) => isQuizBlockType(b.type));
    if (quizBlocks.length > 0) {
      console.log("[getCard] READ transformed quiz blocks", quizBlocks.length, quizBlocks.map((b) => ({ blockId: b.blockId, type: b.type, hasConfigJson: !!b.configJson, configKeys: b.configJson ? Object.keys(b.configJson) : [], question: b.configJson?.question })));
    } else {
      console.log("[getCard] READ no quiz blocks in transformed. blocksSnapshot length", transformed.blocksSnapshot?.length, "block types", (transformed.blocksSnapshot || []).map((b) => b.type));
    }
    return transformed;
  }
  return null;
};

export const updateCard = async (
  uid,
  cardId,
  deckId,
  values,
  blocksSnapshot,
  mainBlockId = undefined,
  subBlockId = undefined,
) => {
  const cardRef = doc(getCardsCollection(uid), cardId);
  const updateData = {
    updated_at: Timestamp.now(),
  };
  // Only write content fields when we have content; write both array and JSON (mobile) format.
  if (values?.length > 0) {
    const valuesData = values.map(transformValueToFirestore);
    updateData.values = valuesData;
    updateData.values_json = JSON.stringify(valuesData);
  }
  if (blocksSnapshot?.length > 0) {
    const blocksSnapshotData = blocksSnapshot.map(transformBlockToFirestore);
    const imageBlocksWritten = blocksSnapshotData.filter((b) => b.type === "image" || b.type === 6);
    if (imageBlocksWritten.length) {
      console.log("[RATIO] updateCard writing to CARD doc", { cardId, imageBlocks: imageBlocksWritten.map((b) => ({ block_id: b.block_id, config_json: b.config_json })) });
    }
    updateData.blocks_snapshot = blocksSnapshotData;
    updateData.blocks_snapshot_json = JSON.stringify(blocksSnapshotData);
  }
  if (mainBlockId !== undefined) updateData.main_block_id = mainBlockId ?? null;
  if (subBlockId !== undefined) updateData.sub_block_id = subBlockId ?? null;
  await setDoc(cardRef, updateData, { merge: true });

  // Update deck's updatedAt
  await updateDeck(uid, deckId, {});
};

export const updateCardReview = async (uid, cardId, updates) => {
  const cardRef = doc(getCardsCollection(uid), cardId);
  await setDoc(
    cardRef,
    {
      srs_state: updates.srsState,
      srs_step: updates.srsStep,
      srs_stability: updates.srsStability ?? null,
      srs_difficulty: updates.srsDifficulty ?? null,
      srs_due: updates.srsDue,
      srs_last_review: updates.srsLastReview,
      review_count: updates.reviewCount,
      updated_at: Timestamp.now(),
    },
    { merge: true },
  );
};

export const deleteCard = async (uid, cardId, deckId) => {
  const cardRef = doc(getCardsCollection(uid), cardId);
  const now = Timestamp.now();
  await setDoc(
    cardRef,
    {
      is_deleted: true,
      updated_at: now,
    },
    { merge: true },
  );

  // Update deck's updatedAt
  await updateDeck(uid, deckId, {});
};

// ============== TEMPLATE OPERATIONS ==============

/** Remove undefined values from an object (Firestore does not accept undefined). Preserves Firestore Timestamp etc. */
function removeUndefined(obj) {
  if (obj === undefined) return undefined;
  if (obj === null || typeof obj !== "object") return obj;
  // Preserve Firestore Timestamp (and similar) so they are stored as timestamp type, not map
  if (obj != null && typeof obj.toMillis === "function") return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined).filter((v) => v !== undefined);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const cleaned = removeUndefined(v);
    if (cleaned !== undefined) out[k] = cleaned;
  }
  return out;
}

export const createTemplate = async (
  uid,
  name,
  description = "",
  blocks = [],
  rendering = null,
  mainBlockId = null,
  subBlockId = null,
) => {
  const templateId = uuidv4();
  const now = Timestamp.now();

  const template = {
    template_id: templateId,
    name: name ?? "",
    description: description ?? "",
    version: 1,
    blocks: blocks.map(transformBlockToFirestore),
    rendering: rendering
      ? {
          front_block_ids: rendering.frontBlockIds || [],
          back_block_ids: rendering.backBlockIds || [],
        }
      : null,
    main_block_id: mainBlockId ?? null,
    sub_block_id: subBlockId ?? null,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };

  const cleaned = removeUndefined(template);
  if (cleaned) {
    await setDoc(doc(getTemplatesCollection(uid), templateId), cleaned);
  }
  return transformTemplateFromFirestore(template);
};

export const getTemplates = async (uid) => {
  const q = query(
    getTemplatesCollection(uid),
    where("is_deleted", "==", false),
  );

  const snapshot = await getDocs(q);
  const templates = snapshot.docs.map((doc) =>
    transformTemplateFromFirestore(doc.data()),
  );
  templates.sort((a, b) => b.updatedAt - a.updatedAt);
  return templates;
};

export const subscribeToTemplates = (uid, callback) => {
  const q = query(
    getTemplatesCollection(uid),
    where("is_deleted", "==", false),
  );

  return onSnapshot(q, (snapshot) => {
    const templates = snapshot.docs.map((doc) =>
      transformTemplateFromFirestore(doc.data()),
    );
    templates.sort((a, b) => b.updatedAt - a.updatedAt);
    callback(templates);
  });
};

export const getTemplate = async (uid, templateId) => {
  const templateRef = doc(getTemplatesCollection(uid), templateId);
  const templateSnap = await getDoc(templateRef);
  if (templateSnap.exists()) {
    return transformTemplateFromFirestore(templateSnap.data());
  }
  return null;
};

export const updateTemplate = async (uid, templateId, updates) => {
  const templateRef = doc(getTemplatesCollection(uid), templateId);
  const updateData = {
    updated_at: Timestamp.now(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.blocks !== undefined)
    updateData.blocks = updates.blocks.map(transformBlockToFirestore);
  if (updates.rendering !== undefined) {
    updateData.rendering = updates.rendering
      ? {
          front_block_ids: updates.rendering.frontBlockIds || [],
          back_block_ids: updates.rendering.backBlockIds || [],
        }
      : null;
  }
  if (updates.mainBlockId !== undefined)
    updateData.main_block_id = updates.mainBlockId ?? null;
  if (updates.subBlockId !== undefined)
    updateData.sub_block_id = updates.subBlockId ?? null;
  if (updates.isDeleted !== undefined)
    updateData.is_deleted = updates.isDeleted;

  // Increment version on update
  const existing = await getTemplate(uid, templateId);
  if (existing) {
    updateData.version = (existing.version || 1) + 1;
  }

  const cleaned = removeUndefined(updateData);
  if (cleaned && Object.keys(cleaned).length > 0) {
    await setDoc(templateRef, cleaned, { merge: true });
  }
};

export const deleteTemplate = async (uid, templateId) => {
  await updateTemplate(uid, templateId, { isDeleted: true });
};

// ============== MEDIA OPERATIONS ==============

/**
 * Upload image to Storage and create media doc.
 * @param {string} uid - User id
 * @param {File|Blob} file - Image file (e.g. from crop)
 * @param {{ onProgress?: (percent: number) => void }} options - Optional onProgress(0-100) for upload progress
 */
export const uploadImage = async (uid, file, options = {}) => {
  const { onProgress } = options;
  const mediaId = uuidv4();
  const name = file.name || "image.png";
  const extension = (typeof name === "string" && name.split(".").pop()) || "png";
  const storagePath = `users/${uid}/media/${mediaId}.${extension}`;
  const storageRef = ref(storage, storagePath);

  if (typeof onProgress === "function") {
    const task = uploadBytesResumable(storageRef, file);
    await new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const percent = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          onProgress(Math.min(100, percent));
        },
        reject,
        resolve
      );
    });
  } else {
    await uploadBytes(storageRef, file);
  }

  const downloadUrl = await getDownloadURL(storageRef);
  const now = Timestamp.now();
  const media = {
    media_id: mediaId,
    storage_path: storagePath,
    download_url: downloadUrl,
    type: "image",
    file_size: file.size,
    mime_type: file.type || "image/png",
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };

  await setDoc(doc(getMediaCollection(uid), mediaId), media);
  return transformMediaFromFirestore(media);
};

export const uploadAudio = async (uid, file) => {
  const mediaId = uuidv4();
  const extension = file.name.split(".").pop();
  const storagePath = `users/${uid}/media/${mediaId}.${extension}`;
  const storageRef = ref(storage, storagePath);

  try {
    await uploadBytes(storageRef, file);
  } catch (e) {
    console.error("uploadAudio: Storage upload failed", e);
    throw new Error(
      `Storage upload failed (path: ${storagePath}). Deploy storage rules and ensure you're signed in. ${e?.message || e}`
    );
  }

  let downloadUrl;
  try {
    downloadUrl = await getDownloadURL(storageRef);
  } catch (e) {
    console.error("uploadAudio: getDownloadURL failed", e);
    throw new Error(`Storage getDownloadURL failed. ${e?.message || e}`);
  }

  const now = Timestamp.now();
  const media = {
    media_id: mediaId,
    storage_path: storagePath,
    download_url: downloadUrl,
    type: "audio",
    file_size: file.size,
    mime_type: file.type,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };

  try {
    await setDoc(doc(getMediaCollection(uid), mediaId), media);
  } catch (e) {
    console.error("uploadAudio: Firestore setDoc failed", e);
    throw new Error(
      `Firestore media doc failed (users/${uid}/media). Deploy firestore rules. ${e?.message || e}`
    );
  }
  return transformMediaFromFirestore(media);
};

export const getMedia = async (uid, mediaId) => {
  const mediaRef = doc(getMediaCollection(uid), mediaId);
  const mediaSnap = await getDoc(mediaRef);
  if (mediaSnap.exists()) {
    return transformMediaFromFirestore(mediaSnap.data());
  }
  return null;
};

export const deleteMedia = async (uid, mediaId, storagePath) => {
  // Delete from Storage when path is known
  if (storagePath) {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error("Error deleting file from storage:", error);
    }
  }

  // Soft delete from Firestore
  const mediaRef = doc(getMediaCollection(uid), mediaId);
  await setDoc(
    mediaRef,
    {
      is_deleted: true,
      updated_at: Timestamp.now(),
    },
    { merge: true },
  );
};

// ============== CARD COUNT ==============

export const getCardCount = async (uid, deckId) => {
  const q = query(
    getCardsCollection(uid),
    where("deck_id", "==", deckId),
    where("is_deleted", "==", false),
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
};

// ============== BLOCK TYPES ==============
// Must match mobile's BlockType enum order

export const BlockType = {
  header1: 0,
  header2: 1,
  header3: 2,
  text: 3,
  quote: 4,
  hiddenText: 5,
  image: 6,
  audio: 7,
  quizMultiSelect: 8,
  quizSingleSelect: 9,
  quizTextAnswer: 10,
  divider: 11,
  space: 12,
};

export const BlockTypeNames = Object.keys(BlockType);

// ============== TRANSFORM HELPERS ==============
// Convert between Firestore (snake_case) and JS (camelCase)

const transformDeckFromFirestore = (data) => {
  const createdAt =
    data.created_at?.toMillis?.() || data.created_at || Date.now();
  const updatedAt =
    data.updated_at?.toMillis?.() || data.updated_at || Date.now();

  return {
    deckId: data.deck_id,
    title: data.title || "Untitled",
    description: data.description || "",
    defaultTemplateId: data.default_template_id || null,
    createdAt,
    updatedAt,
    isDeleted: data.is_deleted || false,
  };
};

// Normalize object from JSON (mobile may send snake_case or camelCase)
function normalizeBlockForTransform(b) {
  if (!b) return b;
  return {
    ...b,
    block_id: b.block_id ?? b.blockId,
    config_json: b.config_json ?? b.configJson,
  };
}
function normalizeValueForTransform(v) {
  if (!v) return v;
  return {
    ...v,
    block_id: v.block_id ?? v.blockId,
    media_ids: v.media_ids ?? v.mediaIds,
    original_media_ids: v.original_media_ids ?? v.originalMediaIds,
    correct_answers: v.correct_answers ?? v.correctAnswers,
  };
}

// Read card content: prefer mobile format (values_json / blocks_snapshot_json) when present
function parseCardContentFromJson(data) {
  let blocksSnapshot;
  let values;
  const usedJson = !!data.blocks_snapshot_json;
  const rawArrayLength = Array.isArray(data.blocks_snapshot) ? data.blocks_snapshot.length : 0;
  console.log("[parseCardContentFromJson] READ using blocks_snapshot_json?", usedJson, "raw blocks_snapshot length", rawArrayLength, "json length", typeof data.blocks_snapshot_json === "string" ? data.blocks_snapshot_json.length : 0);
  if (data.blocks_snapshot_json) {
    try {
      const parsed = JSON.parse(data.blocks_snapshot_json);
      const arr = parsed || [];
      console.log("[parseCardContentFromJson] READ parsed array length", arr.length, "first 200 chars", JSON.stringify(arr).slice(0, 200));
      blocksSnapshot = arr.map((b) =>
        transformBlockFromFirestore(normalizeBlockForTransform(b)),
      );
      const quizRead = (blocksSnapshot || []).filter((b) => isQuizBlockType(b.type));
      if (quizRead.length > 0) {
        console.log("[parseCardContentFromJson] READ after transform quiz blocks", quizRead.length, quizRead.map((b) => ({ blockId: b.blockId, type: b.type, hasConfigJson: !!b.configJson, configKeys: b.configJson ? Object.keys(b.configJson) : [], question: b.configJson?.question?.slice?.(0, 30) })));
      }
    } catch (e) {
      console.warn("[parseCardContentFromJson] READ JSON parse failed", e.message);
      blocksSnapshot = (data.blocks_snapshot || []).map(transformBlockFromFirestore);
    }
  } else {
    blocksSnapshot = (data.blocks_snapshot || []).map(transformBlockFromFirestore);
  }
  if (data.values_json) {
    try {
      const parsed = JSON.parse(data.values_json);
      values = (parsed || []).map((v) =>
        transformValueFromFirestore(normalizeValueForTransform(v)),
      );
    } catch (_) {
      values = (data.values || []).map(transformValueFromFirestore);
    }
  } else {
    values = (data.values || []).map(transformValueFromFirestore);
  }
  return { blocksSnapshot, values };
}

const transformCardFromFirestore = (data) => {
  const createdAt =
    data.created_at?.toMillis?.() || data.created_at || Date.now();
  const updatedAt =
    data.updated_at?.toMillis?.() || data.updated_at || Date.now();

  const { blocksSnapshot, values } = parseCardContentFromJson(data);

  return {
    cardId: data.card_id,
    deckId: data.deck_id,
    templateId: data.template_id,
    templateVersion: data.template_version,
    blocksSnapshot,
    values,
    mainBlockId: data.main_block_id ?? null,
    subBlockId: data.sub_block_id ?? null,
    source: data.source
      ? {
          imageLocalPath: data.source.image_local_path,
          ocrEngine: data.source.ocr_engine,
          imageWidth: data.source.image_width,
          imageHeight: data.source.image_height,
        }
      : null,
    createdAt,
    updatedAt,
    isDeleted: data.is_deleted || false,
    // SRS fields
    srsState: data.srs_state ?? 1,
    srsStep: data.srs_step,
    srsStability: data.srs_stability,
    srsDifficulty: data.srs_difficulty,
    srsDue: data.srs_due,
    srsLastReview: data.srs_last_review,
    reviewCount: data.review_count || 0,
  };
};

const DEFAULT_IMAGE_CONFIG = { cropAspect: 1 };

/** Quiz block types (sync with mobile); used to normalize config_json for web/mobile sync. */
function isQuizBlockType(type) {
  if (type === 8 || type === 9 || type === 10) return true;
  if (typeof type === "string" && /^(8|9|10)$/.test(type)) return true;
  return (
    type === "quizMultiSelect" ||
    type === "quizSingleSelect" ||
    type === "quizTextAnswer"
  );
}

const transformBlockFromFirestore = (data) => {
  const isImage = data.type === "image" || data.type === 6;
  let configJson = data.config_json;
  if (isImage) {
    if (configJson == null) configJson = DEFAULT_IMAGE_CONFIG;
    else if (typeof configJson === "string") {
      try {
        configJson = JSON.parse(configJson);
      } catch {
        configJson = DEFAULT_IMAGE_CONFIG;
      }
    }
  } else if (isQuizBlockType(data.type)) {
    console.log("[transformBlockFromFirestore] READ quiz block", data.block_id, "config_json type", typeof configJson, "config_json null?", configJson == null, "preview", typeof configJson === "string" ? configJson.slice(0, 80) : configJson ? JSON.stringify(configJson).slice(0, 80) : "(none)");
    // Quiz blocks: normalize config to object so web and mobile sync consistently
    if (configJson != null && typeof configJson === "string") {
      try {
        configJson = JSON.parse(configJson);
      } catch (e) {
        console.warn("[transformBlockFromFirestore] READ quiz JSON parse failed", data.block_id, e.message);
        configJson = {};
      }
    }
    if (configJson != null && typeof configJson !== "object") configJson = {};
    // Ensure quiz config has at least a question so UI never shows "undefined"
    if (configJson && (configJson.question == null || configJson.question === "")) {
      configJson = { ...configJson, question: configJson.question ?? "Question" };
    }
    console.log("[transformBlockFromFirestore] READ quiz block out", data.block_id, "configJson keys", configJson ? Object.keys(configJson) : [], "question", configJson?.question?.slice?.(0, 30));
  }
  return {
    blockId: data.block_id,
    type: data.type,
    label: data.label || "",
    required: data.required || false,
    configJson,
  };
};

const transformBlockToFirestore = (block) => {
  const result = {
    block_id: block.blockId ?? null,
    type: block.type ?? "text",
    label: block.label || "",
    required: block.required || false,
  };
  const isImage = block.type === "image" || block.type === 6;
  if (isImage) {
    if (block.configJson !== undefined && block.configJson !== null) {
      try {
        result.config_json = typeof block.configJson === "string"
          ? JSON.parse(block.configJson)
          : block.configJson;
        if (!result.config_json || typeof result.config_json !== "object")
          result.config_json = DEFAULT_IMAGE_CONFIG;
      } catch {
        result.config_json = DEFAULT_IMAGE_CONFIG;
      }
    } else {
      result.config_json = DEFAULT_IMAGE_CONFIG;
    }
  } else if (block.configJson !== undefined && block.configJson !== null) {
    let config = block.configJson;
    // Quiz blocks: always store as object so web and mobile sync consistently
    if (isQuizBlockType(block.type)) {
      console.log("[transformBlockToFirestore] WRITE quiz block", block.blockId, "input configJson type", typeof config, "length", typeof config === "string" ? config.length : "(object)");
      if (typeof config === "string") {
        try {
          config = JSON.parse(config);
        } catch (e) {
          console.warn("[transformBlockToFirestore] WRITE quiz JSON parse failed", block.blockId, e.message);
          config = {};
        }
      }
      if (config == null || typeof config !== "object") config = {};
      console.log("[transformBlockToFirestore] WRITE quiz block out", block.blockId, "config_json keys", Object.keys(config || {}), "question", config?.question?.slice?.(0, 30));
    }
    result.config_json = config;
  }
  return result;
};

const transformValueFromFirestore = (data) => ({
  blockId: data.block_id,
  type: data.type,
  text: data.text,
  items: data.items,
  mediaIds: data.media_ids,
  originalMediaIds: data.original_media_ids,
  correctAnswers: data.correct_answers,
});

const transformValueToFirestore = (value) => {
  const result = {
    block_id: value.blockId,
    type: value.type,
  };
  if (value.text !== undefined) result.text = value.text;
  if (value.items !== undefined) result.items = value.items;
  if (value.mediaIds !== undefined) result.media_ids = value.mediaIds;
  if (value.originalMediaIds !== undefined) result.original_media_ids = value.originalMediaIds;
  if (value.correctAnswers !== undefined)
    result.correct_answers = value.correctAnswers;
  return result;
};

function ensureArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const transformTemplateFromFirestore = (data) => {
  const createdAt =
    data.created_at?.toMillis?.() || data.created_at || Date.now();
  const updatedAt =
    data.updated_at?.toMillis?.() || data.updated_at || Date.now();
  // Normalize blocks (mobile may store blocks as JSON string with camelCase)
  const rawBlocks = ensureArray(data.blocks);
  const blocks = rawBlocks.map((b) =>
    transformBlockFromFirestore(normalizeBlockForTransform(b))
  );

  return {
    templateId: data.template_id ?? data.templateId,
    name: data.name || "Untitled",
    description: data.description || "",
    version: data.version || 1,
    blocks,
    rendering: data.rendering
      ? {
          frontBlockIds: ensureArray(
            data.rendering.front_block_ids ?? data.rendering.frontBlockIds,
          ),
          backBlockIds: ensureArray(
            data.rendering.back_block_ids ?? data.rendering.backBlockIds,
          ),
        }
      : null,
    mainBlockId: data.main_block_id ?? data.mainBlockId ?? null,
    subBlockId: data.sub_block_id ?? data.subBlockId ?? null,
    createdAt,
    updatedAt,
    isDeleted: data.is_deleted ?? false,
  };
};

const transformMediaFromFirestore = (data) => {
  const createdAt =
    data.created_at?.toMillis?.() || data.created_at || Date.now();
  const updatedAt =
    data.updated_at?.toMillis?.() || data.updated_at || Date.now();

  return {
    mediaId: data.media_id,
    storagePath: data.storage_path,
    downloadUrl: data.download_url,
    type: data.type,
    fileSize: data.file_size,
    mimeType: data.mime_type,
    createdAt,
    updatedAt,
    isDeleted: data.is_deleted || false,
  };
};

// ============== DEFAULT TEMPLATES ==============

export const createDefaultTemplates = async (uid) => {
  // Check if user already has templates
  const existingTemplates = await getTemplates(uid);
  if (existingTemplates.length > 0) {
    return existingTemplates;
  }

  // Create English Vocabulary template (matches mobile)
  const wordBlockId = uuidv4();
  const pronunciationBlockId = uuidv4();
  const partOfSpeechBlockId = uuidv4();
  const definitionBlockId = uuidv4();
  const exampleBlockId = uuidv4();
  const synonymsBlockId = uuidv4();

  const englishTemplate = await createTemplate(
    uid,
    "English Vocabulary",
    "Learn English words with definition, pronunciation, and examples",
    [
      {
        blockId: wordBlockId,
        type: BlockType.header1,
        label: "Word",
        required: true,
        configJson: JSON.stringify({ maxLength: 80 }),
      },
      {
        blockId: pronunciationBlockId,
        type: BlockType.header3,
        label: "Pronunciation",
        required: false,
        configJson: JSON.stringify({ maxLength: 120 }),
      },
      {
        blockId: partOfSpeechBlockId,
        type: BlockType.header2,
        label: "Part of Speech",
        required: false,
        configJson: JSON.stringify({ maxLength: 100 }),
      },
      {
        blockId: definitionBlockId,
        type: BlockType.text,
        label: "Definition",
        required: true,
        configJson: JSON.stringify({ multiline: true, appendMode: "newline" }),
      },
      {
        blockId: exampleBlockId,
        type: BlockType.quote,
        label: "Example Sentence",
        required: false,
        configJson: JSON.stringify({ multiline: true }),
      },
      {
        blockId: synonymsBlockId,
        type: BlockType.hiddenText,
        label: "Synonyms",
        required: false,
        configJson: JSON.stringify({ multiline: true }),
      },
    ],
    {
      frontBlockIds: [wordBlockId, pronunciationBlockId],
      backBlockIds: [
        partOfSpeechBlockId,
        definitionBlockId,
        exampleBlockId,
        synonymsBlockId,
      ],
    },
  );

  // Create Japanese Vocabulary template (matches mobile)
  const kanjiBlockId = uuidv4();
  const hiraganaBlockId = uuidv4();
  const romajiBlockId = uuidv4();
  const meaningBlockId = uuidv4();
  const jpExampleBlockId = uuidv4();
  const notesBlockId = uuidv4();

  const japaneseTemplate = await createTemplate(
    uid,
    "Japanese Vocabulary",
    "Learn Japanese words with kanji, reading, and meaning",
    [
      {
        blockId: kanjiBlockId,
        type: BlockType.header1,
        label: "Kanji / Word",
        required: true,
        configJson: JSON.stringify({ maxLength: 80 }),
      },
      {
        blockId: hiraganaBlockId,
        type: BlockType.header2,
        label: "Hiragana / Reading",
        required: false,
        configJson: JSON.stringify({ maxLength: 100 }),
      },
      {
        blockId: romajiBlockId,
        type: BlockType.header3,
        label: "Romaji",
        required: false,
        configJson: JSON.stringify({ maxLength: 120 }),
      },
      {
        blockId: meaningBlockId,
        type: BlockType.text,
        label: "Meaning",
        required: true,
        configJson: JSON.stringify({ multiline: true, appendMode: "newline" }),
      },
      {
        blockId: jpExampleBlockId,
        type: BlockType.quote,
        label: "Example Sentence",
        required: false,
        configJson: JSON.stringify({ multiline: true }),
      },
      {
        blockId: notesBlockId,
        type: BlockType.hiddenText,
        label: "Notes",
        required: false,
        configJson: JSON.stringify({ multiline: true }),
      },
    ],
    {
      frontBlockIds: [kanjiBlockId, hiraganaBlockId],
      backBlockIds: [
        romajiBlockId,
        meaningBlockId,
        jpExampleBlockId,
        notesBlockId,
      ],
    },
  );

  return [englishTemplate, japaneseTemplate];
};

// ============== BULK IMPORT HELPERS ==============

export const importCardsFromSpreadsheet = async (
  uid,
  deckId,
  rows,
  columnMapping,
  templateId = null,
) => {
  const cards = [];

  for (const row of rows) {
    const blocksSnapshot = [];
    const values = [];

    // Map columns to blocks based on user mapping
    for (const [columnIndex, blockConfig] of Object.entries(columnMapping)) {
      const cellValue = row[parseInt(columnIndex)] || "";
      if (!cellValue.trim()) continue;

      const blockId = uuidv4();
      blocksSnapshot.push({
        blockId,
        type: blockConfig.type,
        label: blockConfig.label,
        required: blockConfig.required || false,
        configJson: blockConfig.configJson || null,
      });

      values.push({
        blockId,
        type: blockConfig.type,
        text: cellValue,
        items: null,
        mediaIds: null,
        correctAnswers: null,
      });
    }

    if (values.length > 0) {
      const card = await createCard(
        uid,
        deckId,
        blocksSnapshot,
        values,
        templateId,
      );
      cards.push(card);
    }
  }

  return cards;
};
