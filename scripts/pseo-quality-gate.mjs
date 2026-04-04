/**
 * Programmatic SEO quality gate.
 *
 * Usage:
 *   npm run seo:pseo-gate
 *   npm run seo:pseo-gate -- --base-url=https://www.deckbase.co --min-word-count=300
 *
 * Exits with code 1 when hard-stop conditions are met.
 */

import fs from "fs";
import { fileURLToPath } from "url";

const DEFAULTS = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.deckbase.co",
  minWordCount: 300,
  warnUniquePct: 40,
  failUniquePct: 30,
  warnBatchSize: 100,
  failBatchSize: 500,
  failOnUniqueness: false,
  include: [
    /^\/deckbase-vs-/,
    /^\/.*-alternatives$/,
    /^\/best-/,
    /^\/resources\//,
    /^\/ai-flashcards$/,
  ],
};

function parseArgs(argv) {
  const args = { ...DEFAULTS, include: [...DEFAULTS.include], allowLargeBatch: false };

  for (const raw of argv.slice(2)) {
    if (raw === "--allow-large-batch") {
      args.allowLargeBatch = true;
      continue;
    }

    if (!raw.startsWith("--") || !raw.includes("=")) continue;
    const [k, v] = raw.slice(2).split("=");

    if (k === "base-url") args.baseUrl = v;
    if (k === "min-word-count") args.minWordCount = Number(v);
    if (k === "warn-unique-pct") args.warnUniquePct = Number(v);
    if (k === "fail-unique-pct") args.failUniquePct = Number(v);
    if (k === "warn-batch-size") args.warnBatchSize = Number(v);
    if (k === "fail-batch-size") args.failBatchSize = Number(v);
    if (k === "include-regex") args.include.push(new RegExp(v));
  }

  return args;
}

function shouldInclude(path, includePatterns) {
  return includePatterns.some((pattern) => pattern.test(path));
}

function getFailUniquePct(path, args) {
  void path;
  return Number(args.failUniquePct);
}

function stripHtml(html) {
  let t = html;
  t = t.replace(/<script[\s\S]*?<\/script>/gi, " ");
  t = t.replace(/<style[\s\S]*?<\/style>/gi, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/&[a-zA-Z0-9#]+;/g, " ");
  t = t.replace(/\s+/g, " ").trim().toLowerCase();
  return t;
}

function tokenize(text) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "you",
    "your",
    "into",
    "about",
    "have",
    "are",
    "was",
    "were",
    "will",
    "not",
  ]);
  const tokens = text.match(/[a-z0-9][a-z0-9'-]*/g) || [];
  return tokens.filter((w) => w.length > 2 && !stop.has(w));
}

function toCounter(tokens) {
  const counter = new Map();
  for (const token of tokens) {
    counter.set(token, (counter.get(token) || 0) + 1);
  }
  return counter;
}

function sumCounter(counter) {
  let sum = 0;
  for (const value of counter.values()) sum += value;
  return sum;
}

function overlapRatio(a, b) {
  const totalA = Math.max(1, sumCounter(a));
  let shared = 0;
  for (const [token, count] of a.entries()) {
    const bCount = b.get(token) || 0;
    shared += Math.min(count, bCount);
  }
  return shared / totalA;
}

function isHttpStatusError(fetchError, status) {
  return typeof fetchError === "string" && fetchError.trim() === `HTTP ${status}`;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "deckbase-pseo-gate/1.0 (+https://www.deckbase.co)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return html;
}

async function run() {
  const args = parseArgs(process.argv);
  const baseUrl = args.baseUrl.replace(/\/$/, "");

  const sitemapMetadataPath = fileURLToPath(
    new URL("../lib/sitemap-metadata.js", import.meta.url),
  );
  const metadataSource = fs.readFileSync(sitemapMetadataPath, "utf8");
  const paths = [...metadataSource.matchAll(/path:\s*"([^"]*)"/g)].map((m) => {
    const p = m[1] || "";
    return p.startsWith("/") || p === "" ? p : `/${p}`;
  });
  const targetPaths = paths.filter((p) => shouldInclude(p || "/", args.include));

  if (!targetPaths.length) {
    console.log("No matching programmatic routes found for current include patterns.");
    return;
  }

  const pages = [];
  for (const path of targetPaths) {
    const url = `${baseUrl}${path}`;
    try {
      const html = await fetchPage(url);
      const text = stripHtml(html);
      const words = text.match(/[a-z][a-z'-]*/g) || [];
      const tokens = tokenize(text);
      pages.push({
        path: path || "/",
        url,
        wordCount: words.length,
        counter: toCounter(tokens),
      });
    } catch (error) {
      pages.push({
        path: path || "/",
        url,
        wordCount: 0,
        counter: new Map(),
        fetchError: String(error?.message || error),
      });
    }
  }

  for (const page of pages) {
    let minUnique = 1;
    for (const other of pages) {
      if (page.url === other.url) continue;
      const overlap = overlapRatio(page.counter, other.counter);
      minUnique = Math.min(minUnique, 1 - overlap);
    }
    page.minUniquePct = Math.round(minUnique * 1000) / 10;
  }

  const warnings = [];
  const errors = [];

  if (pages.length >= args.warnBatchSize) {
    warnings.push(
      `Batch size ${pages.length} >= ${args.warnBatchSize}. Require human content audit sampling (5-10%).`,
    );
  }

  if (pages.length >= args.failBatchSize && !args.allowLargeBatch) {
    errors.push(
      `Batch size ${pages.length} >= ${args.failBatchSize}. HARD STOP unless --allow-large-batch is set after explicit quality review.`,
    );
  }

  for (const page of pages) {
    if (page.fetchError) {
      if (isHttpStatusError(page.fetchError, 404)) {
        warnings.push(
          `Fetch warning: ${page.path} returned 404 on ${baseUrl}. This is often expected for newly added routes before first deploy.`,
        );
      } else {
        errors.push(`Fetch failed: ${page.path} (${page.fetchError})`);
      }
      continue;
    }

    if (page.wordCount < args.minWordCount) {
      warnings.push(
        `Low word count: ${page.path} (${page.wordCount} < ${args.minWordCount})`,
      );
    }

    const failUniquePctForPath = getFailUniquePct(page.path, args);

    if (page.minUniquePct < failUniquePctForPath) {
      if (args.failOnUniqueness) {
        errors.push(
          `Uniqueness HARD STOP: ${page.path} (${page.minUniquePct}% < ${failUniquePctForPath}%)`,
        );
      } else {
        warnings.push(
          `Uniqueness warning: ${page.path} (${page.minUniquePct}% < ${failUniquePctForPath}% hard-stop threshold, non-blocking)`,
        );
      }
    } else if (page.minUniquePct < args.warnUniquePct) {
      warnings.push(
        `Uniqueness warning: ${page.path} (${page.minUniquePct}% < ${args.warnUniquePct}%)`,
      );
    }
  }

  const fetchedPages = pages.filter((p) => !p.fetchError);
  const avgUnique =
    fetchedPages.reduce(
      (acc, p) => acc + (Number.isFinite(p.minUniquePct) ? p.minUniquePct : 0),
      0,
    ) / Math.max(1, fetchedPages.length);

  console.log("\nProgrammatic SEO Quality Gate");
  console.log("- baseUrl:", baseUrl);
  console.log("- pages checked:", pages.length);
  console.log("- average minimum uniqueness:", `${avgUnique.toFixed(1)}%`);
  console.log("\nPer-page snapshot");
  for (const page of pages) {
    if (page.fetchError) {
      console.log(`- ${page.path}: fetch_error=${page.fetchError}`);
      continue;
    }
    console.log(
      `- ${page.path}: words=${page.wordCount}, min_unique=${page.minUniquePct}%`,
    );
  }

  if (warnings.length) {
    console.log("\nWarnings");
    for (const item of warnings) console.log(`- ${item}`);
  }

  if (errors.length) {
    console.log("\nErrors");
    for (const item of errors) console.log(`- ${item}`);
    process.exitCode = 1;
  } else {
    console.log("\nPASS: No hard-stop conditions found.");
  }
}

await run();
