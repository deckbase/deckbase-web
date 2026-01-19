import * as XLSX from "xlsx";

/**
 * Spreadsheet Parser Service for Web
 * Parses CSV and Excel files into structured data
 */

/**
 * Supported file types for import
 */
export const SpreadsheetFileType = {
  csv: "csv",
  xls: "xls",
  xlsx: "xlsx",
  apkg: "apkg",
};

/**
 * Get file type from extension
 */
export const getFileTypeFromExtension = (extension) => {
  const ext = extension.toLowerCase();
  switch (ext) {
    case "csv":
      return SpreadsheetFileType.csv;
    case "xls":
      return SpreadsheetFileType.xls;
    case "xlsx":
      return SpreadsheetFileType.xlsx;
    case "apkg":
      return SpreadsheetFileType.apkg;
    default:
      return null;
  }
};

/**
 * Get file type from file name
 */
export const getFileTypeFromPath = (path) => {
  const extension = path.split(".").pop();
  return getFileTypeFromExtension(extension);
};

/**
 * Result of parsing a spreadsheet file
 */
export class SpreadsheetData {
  constructor({ headers, rows, fileName, sheetName = "Sheet1", media = {} }) {
    this.headers = headers;
    this.rows = rows;
    this.fileName = fileName;
    this.sheetName = sheetName;
    this.media = media;
  }

  get columnCount() {
    return this.headers.length;
  }

  get rowCount() {
    return this.rows.length;
  }

  getCell(row, col) {
    if (row < 0 || row >= this.rows.length) return "";
    if (col < 0 || col >= this.rows[row].length) return "";
    return this.rows[row][col];
  }

  getColumn(index) {
    if (index < 0 || index >= this.columnCount) return [];
    return this.rows.map((row) => (index < row.length ? row[index] : ""));
  }

  preview(maxRows) {
    return new SpreadsheetData({
      headers: this.headers,
      rows: this.rows.slice(0, maxRows),
      fileName: this.fileName,
      sheetName: this.sheetName,
      media: this.media,
    });
  }
}

/**
 * Parse a File object
 */
export const parseFile = async (file) => {
  const fileType = getFileTypeFromPath(file.name);

  if (!fileType) {
    throw new Error("Unsupported file type");
  }

  if (fileType === SpreadsheetFileType.apkg) {
    throw new Error("APKG files should be parsed using apkgParser");
  }

  const bytes = await file.arrayBuffer();
  return parseBytes(new Uint8Array(bytes), file.name, fileType);
};

/**
 * Parse spreadsheet from bytes
 */
export const parseBytes = (bytes, fileName, fileType) => {
  switch (fileType) {
    case SpreadsheetFileType.csv:
      return parseCsv(bytes, fileName);
    case SpreadsheetFileType.xls:
    case SpreadsheetFileType.xlsx:
      return parseExcel(bytes, fileName);
    default:
      throw new Error("Unsupported file type");
  }
};

/**
 * Parse CSV from bytes
 */
const parseCsv = (bytes, fileName) => {
  const content = new TextDecoder().decode(bytes);
  const lines = content.split(/\r?\n/);

  if (lines.length === 0) {
    return new SpreadsheetData({
      headers: [],
      rows: [],
      fileName,
    });
  }

  // Parse each line, handling quoted values
  const parseCsvLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCsvLine(lines[0]);
  const rows = lines
    .slice(1)
    .filter((line) => line.trim())
    .map(parseCsvLine);

  return new SpreadsheetData({
    headers,
    rows,
    fileName,
  });
};

/**
 * Parse Excel from bytes
 */
const parseExcel = (bytes, fileName) => {
  const workbook = XLSX.read(bytes, { type: "array" });

  if (workbook.SheetNames.length === 0) {
    return new SpreadsheetData({
      headers: [],
      rows: [],
      fileName,
    });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length === 0) {
    return new SpreadsheetData({
      headers: [],
      rows: [],
      fileName,
      sheetName,
    });
  }

  // First row is headers
  const headers = data[0].map((cell) => (cell ?? "").toString());

  // Remaining rows are data
  const rows = data.slice(1).map((row) =>
    row.map((cell) => (cell ?? "").toString())
  );

  // Filter out completely empty rows
  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell));

  return new SpreadsheetData({
    headers,
    rows: nonEmptyRows,
    fileName,
    sheetName,
  });
};

/**
 * Get available sheet names from an Excel file
 */
export const getSheetNames = (bytes) => {
  try {
    const workbook = XLSX.read(bytes, { type: "array" });
    return workbook.SheetNames;
  } catch {
    return [];
  }
};

/**
 * Parse a specific sheet from an Excel file
 */
export const parseExcelSheet = (bytes, fileName, sheetName) => {
  const workbook = XLSX.read(bytes, { type: "array" });

  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length === 0) {
    return new SpreadsheetData({
      headers: [],
      rows: [],
      fileName,
      sheetName,
    });
  }

  const headers = data[0].map((cell) => (cell ?? "").toString());
  const rows = data.slice(1).map((row) =>
    row.map((cell) => (cell ?? "").toString())
  );
  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell));

  return new SpreadsheetData({
    headers,
    rows: nonEmptyRows,
    fileName,
    sheetName,
  });
};
