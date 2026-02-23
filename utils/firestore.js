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
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/utils/firebase";
import { v4 as uuidv4 } from "uuid";

// ============== FIRESTORE PATH HELPERS ==============
// Matches mobile structure: flashcards/{userId}/data/main/{collection}/{docId}

const getUserDataPath = (uid) => `flashcards/${uid}/data/main`;
const getDecksCollection = (uid) =>
  collection(db, getUserDataPath(uid), "decks");
const getCardsCollection = (uid) =>
  collection(db, getUserDataPath(uid), "cards");
const getTemplatesCollection = (uid) =>
  collection(db, getUserDataPath(uid), "templates");
const getMediaCollection = (uid) => collection(db, "users", uid, "media"); // Media stays in users collection

// Wizard data lives under wizard/{uid}/... (separate from flashcards)
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

/** Legacy flat wizard_deck under flashcards. Used only for migration (read from old path, write to new). */
const getLegacyWizardDeckCollection = (uid) =>
  collection(db, getUserDataPath(uid), "wizard_deck");

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
  const card = {
    card_id: cardId,
    deck_id: null,
    template_id: null,
    blocks_snapshot: blocksSnapshot.map(transformBlockToFirestore),
    values: values.map(transformValueToFirestore),
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
) => {
  const cardId = uuidv4();
  const now = Timestamp.now();

  const card = {
    card_id: cardId,
    deck_id: deckId,
    template_id: templateId,
    blocks_snapshot: blocksSnapshot.map(transformBlockToFirestore),
    values: values.map(transformValueToFirestore),
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
    return transformCardFromFirestore(cardSnap.data());
  }
  return null;
};

export const updateCard = async (
  uid,
  cardId,
  deckId,
  values,
  blocksSnapshot,
) => {
  const cardRef = doc(getCardsCollection(uid), cardId);
  await setDoc(
    cardRef,
    {
      values: values.map(transformValueToFirestore),
      blocks_snapshot: blocksSnapshot.map(transformBlockToFirestore),
      updated_at: Timestamp.now(),
    },
    { merge: true },
  );

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
  await setDoc(
    cardRef,
    {
      is_deleted: true,
      updated_at: Timestamp.now(),
    },
    { merge: true },
  );

  // Update deck's updatedAt
  await updateDeck(uid, deckId, {});
};

// ============== TEMPLATE OPERATIONS ==============

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
    name,
    description,
    version: 1,
    blocks: blocks.map(transformBlockToFirestore),
    rendering: rendering
      ? {
          front_block_ids: rendering.frontBlockIds || [],
          back_block_ids: rendering.backBlockIds || [],
        }
      : null,
    main_block_id: mainBlockId,
    sub_block_id: subBlockId,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };

  await setDoc(doc(getTemplatesCollection(uid), templateId), template);
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
    updateData.main_block_id = updates.mainBlockId;
  if (updates.subBlockId !== undefined)
    updateData.sub_block_id = updates.subBlockId;
  if (updates.isDeleted !== undefined)
    updateData.is_deleted = updates.isDeleted;

  // Increment version on update
  const existing = await getTemplate(uid, templateId);
  if (existing) {
    updateData.version = (existing.version || 1) + 1;
  }

  await setDoc(templateRef, updateData, { merge: true });
};

export const deleteTemplate = async (uid, templateId) => {
  await updateTemplate(uid, templateId, { isDeleted: true });
};

// ============== MEDIA OPERATIONS ==============

export const uploadImage = async (uid, file) => {
  const mediaId = uuidv4();
  const extension = file.name.split(".").pop();
  const storagePath = `users/${uid}/media/${mediaId}.${extension}`;
  const storageRef = ref(storage, storagePath);

  // Upload file
  await uploadBytes(storageRef, file);

  // Get download URL
  const downloadUrl = await getDownloadURL(storageRef);

  // Create media document
  const now = Timestamp.now();
  const media = {
    media_id: mediaId,
    storage_path: storagePath,
    download_url: downloadUrl,
    type: "image",
    file_size: file.size,
    mime_type: file.type,
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
  // Delete from Storage
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting file from storage:", error);
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

// ============== SPEECH ANALYSIS OPERATIONS ==============

export const getSpeechPeople = async () => {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "people"));
  const people = snapshot.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      personId: docSnap.id,
      ...data,
      displayName: data.displayName || data.name || docSnap.id,
      status: data.status || "active",
    };
  });

  return people
    .filter((person) => person.status !== "disabled")
    .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
};

/**
 * Source of truth for speech analysis: all session metadata and analysis results
 * live in this collection only. There is no separate "analysis" or "analysis/v1" doc.
 * Path: people/{personId}/analysis_sessions/{sessionId}
 * Doc fields: status, draftTranscriptId, progress, vocabulary, learningPhrases,
 * patternPhrases, signaturePhrases, corpusStats, updatedAt, etc.
 */
const ANALYSIS_SESSIONS_COLLECTION = "analysis_sessions";

/**
 * Clear analysis fields on a session doc so the UI shows a blank state for this run.
 * Analysis lives in the session doc only (analysis_sessions = source of truth).
 */
export const clearSpeechAnalysis = async (personId, sessionId) => {
  if (!db || !personId || !sessionId) throw new Error("personId and sessionId required");
  const now = Timestamp.now();
  const sessionRef = doc(db, "people", personId, ANALYSIS_SESSIONS_COLLECTION, sessionId);
  await setDoc(sessionRef, {
    vocabulary: [],
    learningPhrases: [],
    patternPhrases: [],
    signaturePhrases: [],
    corpusStats: { docCount: 0, tokenCount: 0, updatedAt: now, methodVersion: "1.0" },
    progress: { processedDocs: 0, totalDocs: 0, percent: 0, updatedAt: now, status: "idle" },
    updatedAt: now,
  }, { merge: true });
};

/**
 * Hierarchy: speaker owns sessions. analysis_sessions is the only place to read/write
 * analysis (vocabulary, phrases, progress). All session access is scoped by personId.
 */

/**
 * Create a new analysis session for the given speaker (used when user taps "Start new analysis").
 * Does not overwrite any existing session; previous sessions remain in the subcollection.
 * Path: people/{personId}/analysis_sessions/{sessionId}
 */
export const createAnalysisSession = async (personId) => {
  if (!db || !personId) throw new Error("personId required");
  const col = collection(db, "people", personId, ANALYSIS_SESSIONS_COLLECTION);
  const now = Timestamp.now();
  const data = {
    status: "draft",
    draftTranscriptId: null,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(col, data);
  return ref.id;
};

/**
 * Update an existing analysis session by id (speaker-scoped).
 * status: "draft" | "processing" | "done". draftTranscriptId: optional.
 * analysisTranscript: optional { transcriptLines, speakerLabel } (stored on session doc; replaces analysis_transcript collection).
 */
export const updateAnalysisSession = async (personId, sessionId, { status, draftTranscriptId, analysisTranscript }) => {
  if (!db || !personId || !sessionId) throw new Error("personId and sessionId required");
  if (status != null && !["draft", "processing", "done"].includes(status))
    throw new Error("Invalid session status");
  if (status === "processing") {
    console.log("[firestore] updateAnalysisSession: setting status=processing", { personId, sessionId });
  }
  const sessionRef = doc(db, "people", personId, ANALYSIS_SESSIONS_COLLECTION, sessionId);
  const updates = { updatedAt: Timestamp.now() };
  if (status != null) updates.status = status;
  if (draftTranscriptId !== undefined) updates.draftTranscriptId = draftTranscriptId ?? null;
  if (analysisTranscript != null) {
    const lines = analysisTranscript.transcriptLines ?? [];
    updates.analysisTranscript = {
      transcriptLines: lines.map((line) => ({
        speaker: line.speaker,
        text: line.text ?? line.content ?? "",
      })),
      speakerLabel: analysisTranscript.speakerLabel ?? null,
    };
  }
  await updateDoc(sessionRef, updates);
  if (status === "processing") {
    console.log("[firestore] updateAnalysisSession: write done (status=processing)");
  }
};

/**
 * Delete an analysis session by id (speaker-scoped).
 */
export const deleteAnalysisSession = async (personId, sessionId) => {
  if (!db || !personId || !sessionId) throw new Error("personId and sessionId required");
  const sessionRef = doc(db, "people", personId, ANALYSIS_SESSIONS_COLLECTION, sessionId);
  await deleteDoc(sessionRef);
};

/**
 * Subscribe to the current analysis session for this speaker (the most recently updated one).
 * Callback receives the full session doc (source of truth: vocabulary, learningPhrases, progress, etc.) or null.
 */
export const subscribeToAnalysisSession = (personId, callback) => {
  if (!db || !personId) {
    callback(null);
    return () => {};
  }
  const col = collection(db, "people", personId, ANALYSIS_SESSIONS_COLLECTION);
  const q = query(col, orderBy("updatedAt", "desc"), limit(1));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const d = snapshot.docs[0];
    callback({ id: d.id, ...d.data() });
  });
};

/**
 * Subscribe to all analysis sessions for this speaker (newest first).
 * Callback receives array of session docs from analysis_sessions (source of truth).
 */
export const subscribeToAnalysisSessions = (personId, callback) => {
  if (!db || !personId) {
    callback([]);
    return () => {};
  }
  const col = collection(db, "people", personId, ANALYSIS_SESSIONS_COLLECTION);
  const q = query(col, orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
};

/**
 * Subscribe to a single analysis session by id (e.g. when opening detail with ?sessionId=).
 * Callback receives the full session doc (source of truth) or null.
 */
export const subscribeToAnalysisSessionById = (personId, sessionId, callback) => {
  if (!db || !personId || !sessionId) {
    callback(null);
    return () => {};
  }
  const sessionRef = doc(db, "people", personId, ANALYSIS_SESSIONS_COLLECTION, sessionId);
  return onSnapshot(sessionRef, (snapshot) => {
    callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  });
};

// Session-scoped saved transcripts (replaces admin_youtube_transcripts for this flow).
// Path: people/{personId}/analysis_sessions/{sessionId}/saved_transcripts/{transcriptId}
const SAVED_TRANSCRIPTS_COLLECTION = "saved_transcripts";

/**
 * Save a YouTube transcript into the current session (speaker-owned, session-owned).
 * Returns { transcriptId }. Caller should set session.draftTranscriptId to transcriptId.
 */
export const saveTranscriptToSession = async (
  personId,
  sessionId,
  {
    youtubeUrl,
    videoId,
    speakerCount,
    transcript,
    fromDiarization,
    defaultSpeakerToAnalyze = null,
  },
) => {
  if (!db || !personId || !sessionId) throw new Error("personId and sessionId required");
  if (!transcript?.length) throw new Error("transcript is required");
  const col = collection(
    db,
    "people",
    personId,
    ANALYSIS_SESSIONS_COLLECTION,
    sessionId,
    SAVED_TRANSCRIPTS_COLLECTION,
  );
  const now = Timestamp.now();
  const data = {
    youtubeUrl: (youtubeUrl || "").trim() || null,
    videoId: videoId || null,
    speakerCount: speakerCount ?? null,
    transcript: transcript.map((line) => ({
      speaker: line.speaker,
      text: line.text,
      start: line.start,
      end: line.end,
    })),
    fromDiarization: Boolean(fromDiarization),
    defaultSpeakerToAnalyze:
      defaultSpeakerToAnalyze != null && defaultSpeakerToAnalyze !== ""
        ? String(defaultSpeakerToAnalyze)
        : null,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(col, data);
  return { transcriptId: ref.id, ...data };
};

/**
 * Subscribe to saved transcripts for a session (newest first).
 */
export const subscribeToSessionTranscripts = (personId, sessionId, callback) => {
  if (!db || !personId || !sessionId) {
    callback([]);
    return () => {};
  }
  const col = collection(
    db,
    "people",
    personId,
    ANALYSIS_SESSIONS_COLLECTION,
    sessionId,
    SAVED_TRANSCRIPTS_COLLECTION,
  );
  const q = query(col, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        transcriptId: d.id,
        youtubeUrl: data.youtubeUrl ?? null,
        videoId: data.videoId ?? null,
        speakerCount: data.speakerCount ?? null,
        transcript: data.transcript ?? [],
        fromDiarization: Boolean(data.fromDiarization),
        defaultSpeakerToAnalyze: data.defaultSpeakerToAnalyze ?? null,
        createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? null,
      };
    });
    callback(list);
  });
};

/**
 * Update default speaker for a session transcript.
 */
export const updateSessionTranscriptSpeaker = async (
  personId,
  sessionId,
  transcriptId,
  { defaultSpeakerToAnalyze },
) => {
  if (!db || !personId || !sessionId || !transcriptId) throw new Error("personId, sessionId, transcriptId required");
  const docRef = doc(
    db,
    "people",
    personId,
    ANALYSIS_SESSIONS_COLLECTION,
    sessionId,
    SAVED_TRANSCRIPTS_COLLECTION,
    transcriptId,
  );
  await updateDoc(docRef, {
    updatedAt: Timestamp.now(),
    defaultSpeakerToAnalyze:
      defaultSpeakerToAnalyze != null && defaultSpeakerToAnalyze !== ""
        ? String(defaultSpeakerToAnalyze)
        : null,
  });
};

/**
 * Delete a saved transcript from a session.
 */
export const deleteSessionTranscript = async (personId, sessionId, transcriptId) => {
  if (!db || !personId || !sessionId || !transcriptId) throw new Error("personId, sessionId, transcriptId required");
  const docRef = doc(
    db,
    "people",
    personId,
    ANALYSIS_SESSIONS_COLLECTION,
    sessionId,
    SAVED_TRANSCRIPTS_COLLECTION,
    transcriptId,
  );
  await deleteDoc(docRef);
};

/**
 * Transcript used for analysis is stored on the session doc (analysisTranscript), not a separate collection.
 */

export const createSpeechPerson = async (displayName) => {
  if (!db) throw new Error("Firestore is not available");
  const trimmedName = (displayName || "").trim();
  if (!trimmedName) throw new Error("Speaker name is required");

  const personRef = doc(collection(db, "people"));
  const now = Timestamp.now();
  const data = {
    displayName: trimmedName,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(personRef, data);
  return { personId: personRef.id, ...data };
};

export const updateSpeechPerson = async (personId, updates) => {
  if (!db || !personId) throw new Error("Firestore or personId required");
  const personRef = doc(db, "people", personId);
  const data = { updatedAt: Timestamp.now() };
  if (updates.displayName !== undefined) data.displayName = String(updates.displayName).trim();
  if (updates.imageUrl !== undefined) data.imageUrl = updates.imageUrl ? String(updates.imageUrl).trim() : null;
  await updateDoc(personRef, data);
  return data;
};

/**
 * Upload a speaker avatar image to Storage and return the download URL.
 * Path: people-avatars/{personId}/{uuid}.{ext}
 */
export const uploadPersonImage = async (personId, file) => {
  if (!storage || !personId || !file) throw new Error("Storage, personId, and file required");
  const ext = file.name?.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
  const storagePath = `people-avatars/${personId}/${uuidv4()}.${safeExt}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
};

export const uploadSpeechTranscript = async ({
  personId,
  text,
  file,
  title,
  sourceUrl,
}) => {
  if (!db || !storage) throw new Error("Storage is not available");
  if (!personId) throw new Error("personId is required");

  let transcriptText = text;
  let sourceFile = file;
  if (!transcriptText && !sourceFile) {
    throw new Error("Transcript text or file is required");
  }

  if (!transcriptText && sourceFile) {
    transcriptText = await sourceFile.text();
  }

  const trimmedText = (transcriptText || "").trim();
  if (!trimmedText) throw new Error("Transcript text is empty");

  const docRef = doc(collection(db, "people", personId, "docs"));
  const docId = docRef.id;
  const storagePath = `speech-transcripts/${personId}/${docId}.txt`;
  const storageRef = ref(storage, storagePath);
  const uploadBlob = sourceFile
    ? sourceFile
    : new Blob([trimmedText], { type: "text/plain" });
  await uploadBytes(storageRef, uploadBlob, { contentType: "text/plain" });
  const downloadUrl = await getDownloadURL(storageRef);
  const bucketName = storage?.app?.options?.storageBucket;
  const gsUrl = bucketName ? `gs://${bucketName}/${storagePath}` : storagePath;

  const wordCount = trimmedText.split(/\s+/).filter(Boolean).length;
  const now = Timestamp.now();
  const docData = {
    title:
      title ||
      sourceFile?.name ||
      `Manual transcript ${now.toDate().toISOString().slice(0, 10)}`,
    sourceType: sourceUrl ? "youtube" : sourceFile ? "upload" : "manual",
    sourceUrl: sourceUrl ? String(sourceUrl).trim() : null,
    storagePath: gsUrl,
    downloadUrl,
    tokenCount: wordCount,
    docDate: now,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, docData);
  return { docId, ...docData };
};

/**
 * List transcript docs for a speaker (sources used for analysis).
 * Path: people/{personId}/docs
 */
export const getSpeechPersonDocs = async (personId) => {
  if (!db || !personId) return [];
  const docsRef = collection(db, "people", personId, "docs");
  const q = query(docsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data() || {};
    return {
      docId: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    };
  });
};

/**
 * Remove a transcript source for a speaker: delete the doc and its storage file,
 * then set all remaining docs to status "queued" so the next analysis run
 * recomputes counts without this source.
 * Caller should then trigger analysis (POST /api/speech/trigger-analysis).
 */
export const removeSpeechPersonSource = async (personId, docId) => {
  if (!db || !storage || !personId || !docId) {
    throw new Error("personId and docId required");
  }
  const docRef = doc(db, "people", personId, "docs", docId);
  const storagePath = `speech-transcripts/${personId}/${docId}.txt`;
  const storageRef = ref(storage, storagePath);

  try {
    await deleteObject(storageRef);
  } catch (e) {
    if (e?.code !== "storage/object-not-found") {
      console.error("Error deleting transcript file:", e);
      throw e;
    }
  }

  await deleteDoc(docRef);

  const docsRef = collection(db, "people", personId, "docs");
  const snapshot = await getDocs(docsRef);
  const batch = [];
  snapshot.docs.forEach((d) => {
    batch.push(updateDoc(d.ref, { status: "queued", updatedAt: Timestamp.now() }));
  });
  if (batch.length > 0) {
    await Promise.all(batch);
  }
};

// Deprecated for session flow: saved transcripts now live under
// people/{personId}/analysis_sessions/{sessionId}/saved_transcripts.
// Kept for backward compat or other use.
const ADMIN_YOUTUBE_TRANSCRIPTS = "admin_youtube_transcripts";

/**
 * Save a YouTube transcript to the admin collection (not under user data).
 * Path: admin_youtube_transcripts/{docId}
 * Optional: personId (scope to speaker so list can filter by speaker), speakerAssignments, defaultSpeakerToAnalyze.
 */
export const saveYoutubeTranscriptToFirebase = async ({
  userId,
  personId = null,
  youtubeUrl,
  videoId,
  speakerCount,
  transcript,
  fromDiarization,
  speakerAssignments = null,
  defaultSpeakerToAnalyze = null,
}) => {
  if (!db) throw new Error("Firestore is not available");
  if (!userId) throw new Error("userId is required");
  if (!transcript?.length) throw new Error("Transcript is required");

  const col = collection(db, ADMIN_YOUTUBE_TRANSCRIPTS);
  const docRef = doc(col);
  const now = Timestamp.now();
  const data = {
    userId,
    youtubeUrl: (youtubeUrl || "").trim() || null,
    videoId: videoId || null,
    speakerCount: speakerCount ?? null,
    transcript: transcript.map((line) => ({
      speaker: line.speaker,
      text: line.text,
      start: line.start,
      end: line.end,
    })),
    fromDiarization: Boolean(fromDiarization),
    createdAt: now,
    updatedAt: now,
  };
  if (personId) {
    data.personId = String(personId);
  }
  if (speakerAssignments != null && typeof speakerAssignments === "object") {
    data.speakerAssignments = speakerAssignments;
  }
  if (defaultSpeakerToAnalyze != null && defaultSpeakerToAnalyze !== "") {
    data.defaultSpeakerToAnalyze = String(defaultSpeakerToAnalyze);
  }

  await setDoc(docRef, data);
  return { transcriptId: docRef.id, ...data };
};

/**
 * Update speaker assignments and default speaker for a saved transcript.
 * Persists which speaker label maps to which personId so loading the transcript can prefill the UI.
 */
export const updateYoutubeTranscriptSpeakerAssignments = async (
  userId,
  transcriptId,
  { speakerAssignments, defaultSpeakerToAnalyze },
) => {
  if (!db) throw new Error("Firestore is not available");
  if (!userId || !transcriptId) throw new Error("userId and transcriptId are required");
  const docRef = doc(db, ADMIN_YOUTUBE_TRANSCRIPTS, transcriptId);
  const updates = { updatedAt: Timestamp.now() };
  if (speakerAssignments != null && typeof speakerAssignments === "object") {
    updates.speakerAssignments = speakerAssignments;
  }
  if (defaultSpeakerToAnalyze !== undefined) {
    updates.defaultSpeakerToAnalyze =
      defaultSpeakerToAnalyze != null && defaultSpeakerToAnalyze !== ""
        ? String(defaultSpeakerToAnalyze)
        : null;
  }
  await updateDoc(docRef, updates);
};

/**
 * Load saved YouTube transcripts for the user from the admin collection (newest first).
 * If personId is provided, only returns transcripts saved for that speaker (avoids showing other sessions/speakers).
 * Index: admin_youtube_transcripts: userId (ASC), createdAt (DESC); with personId filter add composite: userId, personId, createdAt (DESC).
 */
export const getYoutubeTranscriptsFromFirebase = async (userId, options = {}) => {
  if (!db) throw new Error("Firestore is not available");
  if (!userId) return [];

  const { personId } = options;
  const col = collection(db, ADMIN_YOUTUBE_TRANSCRIPTS);

  let q;
  if (personId) {
    q = query(
      col,
      where("userId", "==", userId),
      where("personId", "==", String(personId)),
      orderBy("createdAt", "desc"),
      limit(50),
    );
  } else {
    q = query(
      col,
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50),
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      transcriptId: d.id,
      youtubeUrl: data.youtubeUrl ?? null,
      videoId: data.videoId ?? null,
      speakerCount: data.speakerCount ?? null,
      transcript: data.transcript ?? [],
      fromDiarization: Boolean(data.fromDiarization),
      speakerAssignments: data.speakerAssignments ?? null,
      defaultSpeakerToAnalyze: data.defaultSpeakerToAnalyze ?? null,
      createdAt: data.createdAt?.toMillis?.() ?? null,
    };
  });
};

/**
 * Delete a saved YouTube transcript from the admin collection.
 * Path: admin_youtube_transcripts/{transcriptId}
 * Rules should allow delete only when doc.userId === request.auth.uid.
 */
export const deleteYoutubeTranscriptFromFirebase = async (
  userId,
  transcriptId,
) => {
  if (!db) throw new Error("Firestore is not available");
  if (!userId || !transcriptId)
    throw new Error("userId and transcriptId are required");
  const docRef = doc(db, ADMIN_YOUTUBE_TRANSCRIPTS, transcriptId);
  await deleteDoc(docRef);
};

export const createSpeechDiarizationJob = async ({
  youtubeUrl,
  speakers,
  speakerSamples = [],
  requestedBy,
}) => {
  if (!db || !storage) throw new Error("Storage is not available");
  const trimmedUrl = (youtubeUrl || "").trim();
  if (!trimmedUrl) throw new Error("YouTube URL is required");

  const normalizeLabel = (label) => label.trim().replace(/\s+/g, " ");
  const seenLabels = new Set();
  const normalizedSpeakers = (speakers || [])
    .map((speaker) => ({
      label: normalizeLabel(speaker?.label || ""),
      personId: speaker?.personId || null,
    }))
    .filter((speaker) => speaker.label)
    .filter((speaker) => {
      const key = speaker.label.toLowerCase();
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    });

  if (normalizedSpeakers.length < 2) {
    throw new Error("At least two speakers are required");
  }

  const jobRef = doc(collection(db, "speech_diarization_jobs"));
  const jobId = jobRef.id;
  const now = Timestamp.now();

  const slugify = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const uploadedSamples = [];
  for (const sample of speakerSamples) {
    if (!sample?.file || !sample?.label) continue;
    const labelSlug = slugify(sample.label) || "speaker";
    const extension = sample.file.name?.split(".").pop() || "wav";
    const sampleId = uuidv4();
    const storagePath = `speech-diarization-samples/${jobId}/${labelSlug}/${sampleId}.${extension}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, sample.file, {
      contentType: sample.file.type || "audio/mpeg",
    });
    const downloadUrl = await getDownloadURL(storageRef);
    uploadedSamples.push({
      label: sample.label,
      personId: sample.personId || null,
      storagePath,
      downloadUrl,
      fileName: sample.file.name,
      fileSize: sample.file.size,
      mimeType: sample.file.type || null,
    });
  }

  const jobData = {
    jobId,
    sourceType: "youtube",
    assignmentMode: "voice",
    youtubeUrl: trimmedUrl,
    speakers: normalizedSpeakers,
    speakerLabels: normalizedSpeakers.map((speaker) => speaker.label),
    speakerSamples: uploadedSamples,
    status: "queued",
    progress: {
      status: "queued",
      percent: 0,
    },
    requestedBy: requestedBy || null,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(jobRef, jobData);
  return { jobId, ...jobData };
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

const transformCardFromFirestore = (data) => {
  const createdAt =
    data.created_at?.toMillis?.() || data.created_at || Date.now();
  const updatedAt =
    data.updated_at?.toMillis?.() || data.updated_at || Date.now();

  return {
    cardId: data.card_id,
    deckId: data.deck_id,
    templateId: data.template_id,
    templateVersion: data.template_version,
    blocksSnapshot: (data.blocks_snapshot || []).map(
      transformBlockFromFirestore,
    ),
    values: (data.values || []).map(transformValueFromFirestore),
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

const transformBlockFromFirestore = (data) => ({
  blockId: data.block_id,
  type: data.type,
  label: data.label || "",
  required: data.required || false,
  configJson: data.config_json,
});

const transformBlockToFirestore = (block) => {
  const result = {
    block_id: block.blockId,
    type: block.type,
    label: block.label || "",
    required: block.required || false,
  };
  if (block.configJson !== undefined) {
    result.config_json = block.configJson;
  }
  return result;
};

const transformValueFromFirestore = (data) => ({
  blockId: data.block_id,
  type: data.type,
  text: data.text,
  items: data.items,
  mediaIds: data.media_ids,
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
  if (value.correctAnswers !== undefined)
    result.correct_answers = value.correctAnswers;
  return result;
};

const transformTemplateFromFirestore = (data) => {
  const createdAt =
    data.created_at?.toMillis?.() || data.created_at || Date.now();
  const updatedAt =
    data.updated_at?.toMillis?.() || data.updated_at || Date.now();

  return {
    templateId: data.template_id,
    name: data.name || "Untitled",
    description: data.description || "",
    version: data.version || 1,
    blocks: (data.blocks || []).map(transformBlockFromFirestore),
    rendering: data.rendering
      ? {
          frontBlockIds: data.rendering.front_block_ids || [],
          backBlockIds: data.rendering.back_block_ids || [],
        }
      : null,
    mainBlockId: data.main_block_id || null,
    subBlockId: data.sub_block_id || null,
    createdAt,
    updatedAt,
    isDeleted: data.is_deleted || false,
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
