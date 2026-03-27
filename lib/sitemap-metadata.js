/**
 * Sitemap routes + lastModified (ISO). Bump `lastModified` when page content changes meaningfully.
 */
export const SITEMAP_ROUTES = [
  { path: "", changeFrequency: "weekly", priority: 1.0, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/download", changeFrequency: "weekly", priority: 0.95, lastModified: "2026-03-21T18:00:00.000Z" },
  { path: "/features", changeFrequency: "weekly", priority: 0.9, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/premium", changeFrequency: "weekly", priority: 0.9, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/deckbase-vs-anki", changeFrequency: "monthly", priority: 0.8, lastModified: "2026-03-27T00:00:00.000Z" },
  { path: "/deckbase-vs-quizlet", changeFrequency: "monthly", priority: 0.8, lastModified: "2026-03-27T00:00:00.000Z" },
  { path: "/deckbase-vs-remnote", changeFrequency: "monthly", priority: 0.8, lastModified: "2026-03-27T00:00:00.000Z" },
  { path: "/quizlet-alternatives", changeFrequency: "monthly", priority: 0.78, lastModified: "2026-03-27T00:00:00.000Z" },
  { path: "/anki-alternatives", changeFrequency: "monthly", priority: 0.78, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/best-flashcard-apps", changeFrequency: "monthly", priority: 0.78, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/mcp", changeFrequency: "monthly", priority: 0.65, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/docs", changeFrequency: "monthly", priority: 0.6, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/docs/mcp-server", changeFrequency: "monthly", priority: 0.6, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/resources", changeFrequency: "monthly", priority: 0.55, lastModified: "2026-03-21T12:00:00.000Z" },
  {
    path: "/resources/mcp",
    changeFrequency: "monthly",
    priority: 0.62,
    lastModified: "2026-03-21T12:00:00.000Z",
  },
  {
    path: "/resources/fsrs-guide",
    changeFrequency: "monthly",
    priority: 0.62,
    lastModified: "2026-03-27T00:00:00.000Z",
  },
  {
    path: "/resources/anki-import-export",
    changeFrequency: "monthly",
    priority: 0.62,
    lastModified: "2026-03-27T00:00:00.000Z",
  },
  {
    path: "/resources/ocr-study-workflows",
    changeFrequency: "monthly",
    priority: 0.62,
    lastModified: "2026-03-27T00:00:00.000Z",
  },
  {
    path: "/resources/mcp-study-automation-examples",
    changeFrequency: "monthly",
    priority: 0.62,
    lastModified: "2026-03-27T00:00:00.000Z",
  },
  { path: "/about-us", changeFrequency: "monthly", priority: 0.7, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/contact-us", changeFrequency: "monthly", priority: 0.6, lastModified: "2026-03-21T12:00:00.000Z" },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3, lastModified: "2025-06-01T00:00:00.000Z" },
  { path: "/terms-and-conditions", changeFrequency: "yearly", priority: 0.3, lastModified: "2025-06-01T00:00:00.000Z" },
];
