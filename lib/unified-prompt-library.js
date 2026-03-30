/**
 * Single searchable catalog: subject starters (JSON) + style presets (API entries).
 * @param {Array<{ id: string, label?: string, description?: string, prompt: string, tags?: string[] }>} subjectEntries
 * @param {Array<{ id: string, label?: string, description?: string, snippet: string, tags?: string[] }>} styleEntries
 * @returns {Array<{ id: string, kind: 'subject'|'style', label: string, description?: string, text: string, tags: string[], searchText: string }>}
 */
export function buildUnifiedPromptEntries(subjectEntries, styleEntries) {
  const subjects = (Array.isArray(subjectEntries) ? subjectEntries : [])
    .filter((e) => e && typeof e.id === "string" && typeof e.prompt === "string" && e.prompt.trim())
    .map((e) => {
      const tags = Array.isArray(e.tags) ? e.tags.map((t) => String(t).toLowerCase()) : [];
      const label = e.label || e.id;
      const desc = typeof e.description === "string" ? e.description : "";
      const text = e.prompt.trim();
      return {
        id: `subject:${e.id}`,
        kind: /** @type {const} */ ("subject"),
        label,
        description: desc || undefined,
        text,
        tags,
        searchText: [label, desc, text, ...tags].join(" ").toLowerCase(),
      };
    });

  const styles = (Array.isArray(styleEntries) ? styleEntries : [])
    .filter((e) => e && typeof e.id === "string" && typeof e.snippet === "string" && e.snippet.trim())
    .map((e) => {
      const tags = Array.isArray(e.tags) ? e.tags.map((t) => String(t).toLowerCase()) : [];
      const label = e.label || e.id;
      const desc = typeof e.description === "string" ? e.description : "";
      const text = e.snippet.trim();
      return {
        id: `style:${e.id}`,
        kind: /** @type {const} */ ("style"),
        label,
        description: desc || undefined,
        text,
        tags,
        searchText: [label, desc, text, ...tags].join(" ").toLowerCase(),
      };
    });

  return [...subjects, ...styles];
}

/**
 * @param {string} main
 * @param {string[]} libraryTexts
 */
export function mergeImagePromptParts(main, libraryTexts) {
  const m = typeof main === "string" ? main.trim() : "";
  const parts = (libraryTexts || []).map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean);
  if (!m) return parts.join(", ");
  if (parts.length === 0) return m;
  return `${m}\n\n${parts.join(", ")}`;
}

/** Normalize user-facing tags for storage (slug-like, lowercase). */
export function normalizeMediaTag(tag) {
  if (typeof tag !== "string") return "";
  const t = tag.trim().toLowerCase();
  if (!t) return "";
  return t.replace(/\s+/g, "-").slice(0, 64);
}
