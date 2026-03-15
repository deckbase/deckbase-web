/**
 * Extract text from PDF, DOCX, or XLSX for File-to-AI-Cards.
 * Used by POST /api/cards/file-to-ai.
 */

const MAX_CHARS = 50000; // cap for AI context
const PDF_MAX_PAGES = 20;
const XLSX_MAX_SHEETS = 2;

/**
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {{ maxChars?: number }} [options]
 * @returns {Promise<{ text: string, meta?: { pageCount?: number, sheetNames?: string[] } }>}
 */
export async function extractText(buffer, mimeType, options = {}) {
  const maxChars = options.maxChars ?? MAX_CHARS;
  const normalized = (mimeType || "").toLowerCase().trim();

  if (normalized === "application/pdf") {
    return extractFromPdf(buffer, maxChars);
  }
  if (normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractFromDocx(buffer, maxChars);
  }
  if (
    normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    normalized === "application/vnd.ms-excel"
  ) {
    return await extractFromXlsx(buffer, maxChars);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function extractFromPdf(buffer, maxChars) {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer, { max: PDF_MAX_PAGES });
    const text = (data.text || "").trim().slice(0, maxChars);
    return { text, meta: { pageCount: data.numpages } };
  } catch (e) {
    if (e.message?.includes("not available")) throw e;
    throw new Error("PDF extraction failed. Install pdf-parse: npm install pdf-parse");
  }
}

async function extractFromDocx(buffer, maxChars) {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || "").trim().slice(0, maxChars);
    return { text };
  } catch (e) {
    if (e.message?.includes("not available")) throw e;
    throw new Error("DOCX extraction failed. Install mammoth: npm install mammoth");
  }
}

async function extractFromXlsx(buffer, maxChars) {
  const mod = await import("xlsx");
  const XLSX = mod.default || mod;
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames.slice(0, XLSX_MAX_SHEETS);
  const parts = [];
  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const text = rows
      .map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? "").trim()).join("\t") : ""))
      .join("\n");
    parts.push(`[Sheet: ${name}]\n${text}`);
  }
  const text = parts.join("\n\n").trim().slice(0, maxChars);
  return { text, meta: { sheetNames } };
}

/** MIME types handled by extractText (not images). */
export const EXTRACTABLE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const ALLOWED_MIME_TYPES = [...EXTRACTABLE_MIME_TYPES, ...IMAGE_MIME_TYPES];

/** AI from file: documents + images only (no CSV/Excel/APKG — use Import spreadsheet for those). */
export const AI_FROM_FILE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ...IMAGE_MIME_TYPES,
];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
