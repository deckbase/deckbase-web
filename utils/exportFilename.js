/**
 * Build a safe download filename base from a deck title: lowercase snake_case,
 * ASCII letters/digits only (non-latin characters are dropped), max length.
 *
 * @param {string} [title]
 * @returns {string}
 */
export function deckTitleToExportFilenameBase(title) {
  const s = String(title ?? "deck").trim().toLowerCase();
  const slug = s
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return (slug || "deck").slice(0, 50);
}
