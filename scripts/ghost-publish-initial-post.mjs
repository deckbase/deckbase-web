/**
 * Publishes the first SEO-oriented post to Ghost via Admin API.
 * Setup: Ghost Admin → Settings → Integrations → Add custom integration → Admin API key.
 *
 * Usage:
 *   node scripts/ghost-publish-initial-post.mjs --dry-run
 *   GHOST_POST_STATUS=published node scripts/ghost-publish-initial-post.mjs
 *
 * Env: GHOST_URL, GHOST_ADMIN_API_KEY (see .env.example)
 * Optional: GHOST_POST_STATUS (draft | published), GHOST_DECKBASE_SITE_URL (link base)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import GhostAdminAPI from "@tryghost/admin-api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

const dryRun = process.argv.includes("--dry-run");

const SITE =
  process.env.GHOST_DECKBASE_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.deckbase.co";

const title =
  "From PDFs to study-ready flashcards: what an AI flashcard maker actually does";
const slug = "ai-flashcards-pdf-maker-guide";
const metaDescription =
  "How AI flashcard generators turn notes and PDFs into cards you can review on mobile—with realistic limits and when to pair them with Anki-style workflows.";
const excerpt =
  "A practical overview of AI flashcard makers: PDFs, mobile study, and how Deckbase fits into your stack—without hype.";

const html = `
<p>Students and professionals often have the content already—slides, PDFs, lecture notes—and still lose time turning it into something they can <em>review</em>. That gap is where <strong>AI flashcard makers</strong> and <strong>flashcard generators</strong> show up: they help you go from source material to cards faster than manual typing, as long as you keep quality control in mind.</p>

<h2>Why “PDF to flashcards” is a real search</h2>
<p>People explicitly look for ways to create flashcards from PDFs because PDFs are the default container for syllabi, papers, and handouts. A good workflow extracts the key claims, definitions, and questions—then stores them in a format you can rehearse. If you are evaluating tools, check how they handle structure (headings, lists), whether you can edit cards before syncing, and what happens on the <strong>free tier</strong> versus paid plans.</p>

<h2>Mobile and the “flashcard app” expectation</h2>
<p>Most serious learners want the same deck on the phone they use between meetings or on the commute. That means a credible <strong>flashcard app</strong> experience: sync, offline or low-friction access where possible, and review modes that match how you actually study—not just a web preview.</p>

<h2>Anki and alternatives</h2>
<p>If you already use spaced repetition elsewhere, you do not need a philosophical war—just a clear bridge. Many users combine a fast generator for first-pass cards with mature SRS ecosystems. For context on how Deckbase compares in positioning, see our <a href="${SITE}/deckbase-vs-anki">Deckbase vs Anki</a> page and the broader <a href="${SITE}/anki-alternatives">Anki alternatives</a> roundup.</p>

<h2>Try the AI flashcards surface</h2>
<p>Deckbase’s public entry for this use case is <a href="${SITE}/ai-flashcards">AI flashcards</a>: create cards from your material, refine them, and study in the app. For installs, use <a href="${SITE}/download">Download</a>.</p>

<p><em>Disclosure:</em> Limits, pricing, and features change—verify inside the product before making a purchase decision.</p>
`.trim();

async function main() {
  loadEnv();

  const url = process.env.GHOST_URL?.replace(/\/$/, "");
  const key = process.env.GHOST_ADMIN_API_KEY;
  const status =
    process.env.GHOST_POST_STATUS === "published" ? "published" : "draft";

  if (dryRun) {
    console.log("--- dry run (no API call) ---\n");
    console.log("SITE (links):", SITE);
    console.log("status would be:", status);
    console.log("\n--- title ---\n", title);
    console.log("\n--- meta description ---\n", metaDescription);
    console.log("\n--- html ---\n", html);
    return;
  }

  if (!url || !key) {
    console.error(
      "Set GHOST_URL (e.g. https://blog.example.com) and GHOST_ADMIN_API_KEY in .env.local or the environment.",
    );
    process.exit(1);
  }

  const api = new GhostAdminAPI({
    url,
    key,
    version: "v5.0",
  });

  const post = await api.posts.add(
    {
      title,
      slug,
      html,
      excerpt,
      status,
      meta_title: title,
      meta_description: metaDescription,
      tags: [{ name: "AI flashcards" }, { name: "Product" }],
    },
    { source: "html" },
  );

  const p = post;
  console.log("Created Ghost post:", p.id);
  console.log("Slug:", p.slug, "Status:", p.status);
  if (p.url) console.log("URL:", p.url);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
