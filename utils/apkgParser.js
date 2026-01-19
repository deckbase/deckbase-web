import JSZip from "jszip";
import { SpreadsheetData } from "./spreadsheetParser";

/**
 * APKG Parser Service for Web
 * Parses Anki .apkg files (which are ZIP archives containing SQLite databases)
 * Uses sql.js loaded from CDN to avoid Next.js bundling issues
 */

/**
 * Result of parsing an APKG file
 */
export class ApkgData {
  constructor({ deckName, notes, fieldNames, media = {} }) {
    this.deckName = deckName;
    this.notes = notes;
    this.fieldNames = fieldNames;
    this.media = media;
  }

  get noteCount() {
    return this.notes.length;
  }

  /**
   * Convert to SpreadsheetData format for unified UI
   * Extracts audio and image references as separate columns for easy mapping
   */
  toSpreadsheetData() {
    const audioRegex = /\[audio:\s*([^\]]+)\]/g;
    const imageRegex = /\[image:\s*([^\]]+)\]/g;

    // Analyze each column to detect if it contains audio/image markers
    const columnsWithAudio = {};
    const columnsWithImage = {};

    for (const note of this.notes) {
      for (let i = 0; i < note.fields.length; i++) {
        const field = note.fields[i];
        if (audioRegex.test(field)) {
          columnsWithAudio[i] = true;
          audioRegex.lastIndex = 0;
        }
        if (imageRegex.test(field)) {
          columnsWithImage[i] = true;
          imageRegex.lastIndex = 0;
        }
      }
    }

    // Build new headers and rows with separated audio/image columns
    const newHeaders = [];
    const newRows = this.notes.map(() => []);

    for (let colIdx = 0; colIdx < this.fieldNames.length; colIdx++) {
      const header = this.fieldNames[colIdx];
      const hasAudio = columnsWithAudio[colIdx] === true;
      const hasImage = columnsWithImage[colIdx] === true;

      // Add the original column (with or without audio/image stripped)
      newHeaders.push(header);
      for (let rowIdx = 0; rowIdx < this.notes.length; rowIdx++) {
        const field =
          colIdx < this.notes[rowIdx].fields.length
            ? this.notes[rowIdx].fields[colIdx]
            : "";

        if (hasAudio || hasImage) {
          // Strip audio and image markers from the text column
          let cleanedField = field;
          if (hasAudio) {
            cleanedField = cleanedField.replace(audioRegex, "").trim();
            audioRegex.lastIndex = 0;
          }
          if (hasImage) {
            cleanedField = cleanedField.replace(imageRegex, "").trim();
            imageRegex.lastIndex = 0;
          }
          cleanedField = cleanedField.replace(/\s+/g, " ").trim();
          newRows[rowIdx].push(cleanedField);
        } else {
          newRows[rowIdx].push(field);
        }
      }

      // Add separate audio column if this column had audio markers
      if (hasAudio) {
        newHeaders.push(`${header} (Audio)`);
        for (let rowIdx = 0; rowIdx < this.notes.length; rowIdx++) {
          const field =
            colIdx < this.notes[rowIdx].fields.length
              ? this.notes[rowIdx].fields[colIdx]
              : "";
          const audioMatches = [...field.matchAll(audioRegex)];
          const audioRefs = audioMatches
            .map((m) => `[audio: ${m[1]}]`)
            .join(" ");
          audioRegex.lastIndex = 0;
          newRows[rowIdx].push(audioRefs);
        }
      }

      // Add separate image column if this column had image markers
      if (hasImage) {
        newHeaders.push(`${header} (Image)`);
        for (let rowIdx = 0; rowIdx < this.notes.length; rowIdx++) {
          const field =
            colIdx < this.notes[rowIdx].fields.length
              ? this.notes[rowIdx].fields[colIdx]
              : "";
          const imageMatches = [...field.matchAll(imageRegex)];
          const imageRefs = imageMatches
            .map((m) => `[image: ${m[1]}]`)
            .join(" ");
          imageRegex.lastIndex = 0;
          newRows[rowIdx].push(imageRefs);
        }
      }
    }

    return new SpreadsheetData({
      headers: newHeaders,
      rows: newRows,
      fileName: this.deckName,
      sheetName: "Anki Cards",
      media: this.media,
    });
  }
}

/**
 * Represents a note from Anki
 */
export class AnkiNote {
  constructor({ id, modelId, fields, tags = [] }) {
    this.id = id;
    this.modelId = modelId;
    this.fields = fields;
    this.tags = tags;
  }
}

// Store SQL.js instance
let SQL = null;

/**
 * Load sql.js from CDN
 * This avoids Next.js/Turbopack bundling issues with the sql.js npm package
 */
const loadSqlJs = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("sql.js can only be used in browser environment"));
      return;
    }

    // Check if already loaded
    if (window.initSqlJs) {
      resolve(window.initSqlJs);
      return;
    }

    // Load from CDN
    const script = document.createElement("script");
    script.src = "https://sql.js.org/dist/sql-wasm.js";
    script.async = true;

    script.onload = () => {
      if (window.initSqlJs) {
        resolve(window.initSqlJs);
      } else {
        reject(new Error("Failed to load sql.js"));
      }
    };

    script.onerror = () => {
      reject(new Error("Failed to load sql.js from CDN"));
    };

    document.head.appendChild(script);
  });
};

/**
 * Initialize SQL.js (loads WASM)
 */
const initSql = async () => {
  if (SQL) return SQL;

  const initSqlJs = await loadSqlJs();
  SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  return SQL;
};

/**
 * Parse APKG file from File object
 */
export const parseApkgFile = async (file) => {
  const bytes = await file.arrayBuffer();
  return parseApkgBytes(new Uint8Array(bytes), file.name);
};

/**
 * Parse APKG file from bytes
 */
export const parseApkgBytes = async (bytes, fileName) => {
  // Initialize SQL.js
  await initSql();

  // Extract ZIP contents
  const zip = await JSZip.loadAsync(bytes);

  // Find the database file
  let dbData = null;
  const dbFile = zip.file("collection.anki2") || zip.file("collection.anki21");
  if (dbFile) {
    dbData = await dbFile.async("uint8array");
  }

  if (!dbData) {
    throw new Error("Failed to extract APKG: database file not found");
  }

  // Parse media mapping
  let mediaMapping = {};
  const mediaFile = zip.file("media");
  if (mediaFile) {
    try {
      const content = await mediaFile.async("string");
      mediaMapping = JSON.parse(content);
    } catch {
      // Ignore media mapping errors
    }
  }

  // Extract media files
  const media = {};
  for (const [numericId, originalName] of Object.entries(mediaMapping)) {
    const mediaFileInZip = zip.file(numericId);
    if (mediaFileInZip) {
      try {
        media[originalName] = await mediaFileInZip.async("uint8array");
      } catch {
        // Ignore individual media errors
      }
    }
  }

  // Parse SQLite database
  return parseSqliteDatabase(dbData, fileName, media);
};

/**
 * Parse the Anki SQLite database
 */
const parseSqliteDatabase = (dbData, fileName, media) => {
  const db = new SQL.Database(dbData);

  let deckName = fileName.replace(".apkg", "");
  let fieldNames = ["Front", "Back"];
  const notes = [];
  const modelFieldNames = {};

  try {
    // Get deck name and field names from 'col' table
    const colResult = db.exec("SELECT decks, models FROM col LIMIT 1");
    if (colResult.length > 0 && colResult[0].values.length > 0) {
      const [decksJson, modelsJson] = colResult[0].values[0];

      // Parse decks JSON to get deck name
      if (decksJson) {
        try {
          const decks = JSON.parse(decksJson);
          for (const deck of Object.values(decks)) {
            if (deck.name && deck.name !== "Default" && deck.name.trim()) {
              deckName = deck.name;
              break;
            }
          }
        } catch {
          // Ignore deck parsing errors
        }
      }

      // Parse models JSON to get field names for ALL models
      if (modelsJson) {
        try {
          const models = JSON.parse(modelsJson);

          for (const [modelId, model] of Object.entries(models)) {
            if (model.flds) {
              const names = model.flds.map((f) => f.name || "Field");
              modelFieldNames[modelId] = names;
            }
          }

          // Find the model with most fields to use as header
          if (Object.keys(modelFieldNames).length > 0) {
            let maxFields = 0;
            for (const fields of Object.values(modelFieldNames)) {
              if (fields.length > maxFields) {
                maxFields = fields.length;
                fieldNames = fields;
              }
            }

            // If there are multiple models with different field structures,
            // use generic field names to avoid confusion
            if (Object.keys(modelFieldNames).length > 1) {
              const allFieldNameSets = new Set(
                Object.values(modelFieldNames).map((f) => f.join("|"))
              );
              if (allFieldNameSets.size > 1) {
                fieldNames = Array.from(
                  { length: maxFields },
                  (_, i) => `Field ${i + 1}`
                );
              }
            }
          }
        } catch {
          // Ignore model parsing errors
        }
      }
    }

    // Get notes from 'notes' table
    const notesResult = db.exec("SELECT id, mid, flds, tags FROM notes");
    if (notesResult.length > 0) {
      for (const row of notesResult[0].values) {
        const [id, modelId, fieldsStr, tagsStr] = row;

        // Fields are separated by \x1f (unit separator, char code 31)
        const rawFields = (fieldsStr || "").split("\x1f");
        const fields = rawFields.map((f) => cleanAnkiField(f));
        const tags = (tagsStr || "")
          .trim()
          .split(" ")
          .filter((t) => t);

        // Ensure we have enough fields to match headers
        while (fields.length < fieldNames.length) {
          fields.push("");
        }

        // If this model has more fields than our header, extend header
        if (fields.length > fieldNames.length) {
          while (fieldNames.length < fields.length) {
            fieldNames.push(`Field ${fieldNames.length + 1}`);
          }
        }

        notes.push(
          new AnkiNote({
            id,
            modelId,
            fields,
            tags,
          })
        );
      }
    }
  } finally {
    db.close();
  }

  return new ApkgData({
    deckName,
    notes,
    fieldNames,
    media,
  });
};

/**
 * Clean Anki field content - strip HTML tags and return plain text
 * Preserves: URLs from links, image sources, and audio/sound references
 */
const cleanAnkiField = (field) => {
  let cleaned = field;

  // Extract URLs from <a href="..."> tags and preserve them
  cleaned = cleaned.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,
    (_, url, text) => {
      if (text.trim() === url.trim() || !text.trim()) {
        return url;
      }
      return `${text} (${url})`;
    }
  );

  // Extract image sources from <img src="..."> tags
  cleaned = cleaned.replace(
    /<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
    (_, src) => `[image: ${src}]`
  );

  // Preserve [sound:...] references - convert to readable format
  cleaned = cleaned.replace(
    /\[sound:([^\]]+)\]/g,
    (_, filename) => `[audio: ${filename}]`
  );

  // Extract audio sources from <audio> tags if any
  cleaned = cleaned.replace(
    /<audio\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
    (_, src) => `[audio: ${src}]`
  );

  cleaned = cleaned
    // Convert <br> tags to newlines first
    .replace(/<br\s*\/?>/gi, "\n")
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();

  // Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n\s*\n/g, "\n");
  cleaned = cleaned.trim();

  return cleaned;
};

/**
 * Strip all HTML and return plain text only (single line)
 * Use this for search indexing
 */
export const cleanAnkiFieldPlainText = (field) => {
  let cleaned = cleanAnkiField(field);
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
};
