import {
  collection,
  doc,
  setDoc,
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
    transformDeckFromFirestore(doc.data())
  );
  // Sort by updatedAt descending
  decks.sort((a, b) => b.updatedAt - a.updatedAt);
  return decks;
};

export const subscribeToDecks = (uid, callback) => {
  const q = query(getDecksCollection(uid), where("is_deleted", "==", false));

  return onSnapshot(q, (snapshot) => {
    const decks = snapshot.docs.map((doc) =>
      transformDeckFromFirestore(doc.data())
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
  templateId = null
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
    where("is_deleted", "==", false)
  );

  const snapshot = await getDocs(q);
  const cards = snapshot.docs.map((doc) =>
    transformCardFromFirestore(doc.data())
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
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const cards = snapshot.docs.map((doc) =>
      transformCardFromFirestore(doc.data())
    );
    return cards;
  } catch (error) {
    console.error("Error querying due cards:", error);
    // Fallback when Firestore requires a composite index.
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
    where("is_deleted", "==", false)
  );

  return onSnapshot(q, (snapshot) => {
    const cards = snapshot.docs.map((doc) =>
      transformCardFromFirestore(doc.data())
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
  blocksSnapshot
) => {
  const cardRef = doc(getCardsCollection(uid), cardId);
  await setDoc(
    cardRef,
    {
      values: values.map(transformValueToFirestore),
      blocks_snapshot: blocksSnapshot.map(transformBlockToFirestore),
      updated_at: Timestamp.now(),
    },
    { merge: true }
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
    { merge: true }
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
    { merge: true }
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
  subBlockId = null
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
    where("is_deleted", "==", false)
  );

  const snapshot = await getDocs(q);
  const templates = snapshot.docs.map((doc) =>
    transformTemplateFromFirestore(doc.data())
  );
  templates.sort((a, b) => b.updatedAt - a.updatedAt);
  return templates;
};

export const subscribeToTemplates = (uid, callback) => {
  const q = query(
    getTemplatesCollection(uid),
    where("is_deleted", "==", false)
  );

  return onSnapshot(q, (snapshot) => {
    const templates = snapshot.docs.map((doc) =>
      transformTemplateFromFirestore(doc.data())
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
    { merge: true }
  );
};

// ============== CARD COUNT ==============

export const getCardCount = async (uid, deckId) => {
  const q = query(
    getCardsCollection(uid),
    where("deck_id", "==", deckId),
    where("is_deleted", "==", false)
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

export const getSpeechAnalysis = async (personId) => {
  if (!db || !personId) return null;
  const analysisRef = doc(db, "people", personId, "analysis", "v1");
  const analysisSnap = await getDoc(analysisRef);
  if (analysisSnap.exists()) {
    return analysisSnap.data();
  }
  return null;
};

export const subscribeToSpeechAnalysis = (personId, callback) => {
  if (!db || !personId) {
    callback(null);
    return () => {};
  }
  const analysisRef = doc(db, "people", personId, "analysis", "v1");
  return onSnapshot(analysisRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
};

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

export const uploadSpeechTranscript = async ({
  personId,
  text,
  file,
  title,
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
    sourceType: sourceFile ? "upload" : "manual",
    sourceUrl: null,
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

export const createSpeechDiarizationJob = async ({
  youtubeUrl,
  speakers,
  speakerSamples = [],
  requestedBy,
}) => {
  if (!db) throw new Error("Firestore is not available");
  const shouldUploadSamples = Array.isArray(speakerSamples) && speakerSamples.length > 0;
  if (shouldUploadSamples && !storage) {
    throw new Error("Storage is not available");
  }
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
  if (shouldUploadSamples) {
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
  }

  const jobData = {
    jobId,
    sourceType: "youtube",
    assignmentMode: "post_label",
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
      transformBlockFromFirestore
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
    }
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
    }
  );

  return [englishTemplate, japaneseTemplate];
};

// ============== BULK IMPORT HELPERS ==============

export const importCardsFromSpreadsheet = async (
  uid,
  deckId,
  rows,
  columnMapping,
  templateId = null
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
        templateId
      );
      cards.push(card);
    }
  }

  return cards;
};
