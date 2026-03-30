/**
 * Curated style presets for AI image generation (Deckbase-original snippets).
 * Data: data/image-style-prompts.json
 */

import stylePromptsJson from "../data/image-style-prompts.json";

export const STYLE_PROMPT_LIBRARY_VERSION = 7;

/**
 * @returns {Array<{ id: string, label: string, description?: string, snippet: string, tags: string[] }>}
 */
export function getStylePromptEntries() {
  const raw = Array.isArray(stylePromptsJson) ? stylePromptsJson : [];
  return raw.filter(
    (e) =>
      e &&
      typeof e.id === "string" &&
      typeof e.snippet === "string" &&
      e.id.trim() &&
      e.snippet.trim(),
  );
}

/**
 * @param {string} id
 * @returns {{ id: string, label: string, description?: string, snippet: string, tags: string[] } | null}
 */
export function getStylePromptById(id) {
  if (!id || typeof id !== "string") return null;
  const key = id.trim();
  return getStylePromptEntries().find((e) => e.id === key) ?? null;
}

/**
 * @param {ReturnType<getStylePromptEntries>} entries
 * @param {string} tag - kebab-case; empty = no filter
 */
export function filterStylePromptEntriesByTag(entries, tag) {
  if (!tag || typeof tag !== "string") return entries;
  const t = tag.trim().toLowerCase();
  if (!t) return entries;
  return entries.filter((e) => Array.isArray(e.tags) && e.tags.includes(t));
}

/**
 * @param {ReturnType<getStylePromptEntries>} entries
 * @returns {string[]}
 */
export function collectStylePromptTags(entries) {
  const s = new Set();
  for (const e of entries) {
    if (Array.isArray(e.tags)) {
      for (const t of e.tags) {
        if (typeof t === "string" && t.trim()) s.add(t.trim().toLowerCase());
      }
    }
  }
  return Array.from(s).sort();
}

/**
 * Merge user subject prompt with a style snippet (server convention).
 * @param {string} userPrompt
 * @param {string} snippet
 */
export function mergeStylePrompt(userPrompt, snippet) {
  const u = typeof userPrompt === "string" ? userPrompt.trim() : "";
  const s = typeof snippet === "string" ? snippet.trim() : "";
  if (!s) return u;
  if (!u) return s;
  return `${u}, ${s}`;
}
