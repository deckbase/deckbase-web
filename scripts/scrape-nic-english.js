#!/usr/bin/env node
/**
 * Scrape https://nic-english.com/phrase/ and output a table (CSV).
 * Columns: japanese_translation, phrase, category, part_of_speech, explanation
 *
 * Usage:
 *   node scripts/scrape-nic-english.js [--pages=N] [--output=file.csv] [--incremental]
 *   --pages=N      Number of archive pages to scrape (default: all; max 315)
 *   --output       Output CSV path (default: nic-english-phrases.csv)
 *   --incremental  Merge with existing JSON and only fetch details for new phrases
 */

const fs = require('fs');
const path = require('path');
const { load } = require('cheerio');

const BASE_URL = 'https://nic-english.com/phrase';
const MAX_PAGES = 315;
const DEFAULT_PAGES = MAX_PAGES;
const DEFAULT_OUTPUT = 'nic-english-phrases.csv';

function parseArgs() {
  const args = process.argv.slice(2);
  let pages = DEFAULT_PAGES;
  let output = DEFAULT_OUTPUT;
  let incremental = false;
  for (const arg of args) {
    if (arg.startsWith('--pages=')) {
      const parsed = parseInt(arg.slice(8), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        pages = Math.min(MAX_PAGES, parsed);
      }
    }
    if (arg.startsWith('--output=')) output = arg.slice(9).trim() || DEFAULT_OUTPUT;
    if (arg === '--incremental' || arg === '--only-new') incremental = true;
  }
  return { pages, output, incremental };
}

function escapeCsvCell(str) {
  if (str == null) return '""';
  const s = String(str).replace(/"/g, '""');
  return `"${s}"`;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nic-english-scraper/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function phraseKey(row) {
  return `${row.japanese_translation}|||${row.phrase}`;
}

function loadExisting(jsonPath) {
  try {
    if (!fs.existsSync(jsonPath)) return [];
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(`Error loading existing JSON from ${jsonPath}:`, e);
    return [];
  }
}

function parsePage(html) {
  const $ = load(html);
  const rows = [];

  $('article.phrase_archive_single-wrapper').each((_, el) => {
    const $art = $(el);

    const $title = $art.find('h2.entry-title a');
    const detailUrl = $title.attr('href') || '';

    // Title: "Japanese。<br> English phrase."
    let japanese = '';
    let phrase = '';
    const titleHtml = $title.html() || '';
    const brIdx = titleHtml.indexOf('<br>');
    if (brIdx >= 0) {
      japanese = $('<div>').html(titleHtml.slice(0, brIdx)).text().trim();
      phrase = $('<div>').html(titleHtml.slice(brIdx + 5)).text().trim();
    } else {
      const full = $title.text().trim();
      const dot = full.indexOf('。');
      if (dot >= 0) {
        japanese = full.slice(0, dot + 1);
        phrase = full.slice(dot + 1).trim();
      } else {
        phrase = full;
      }
    }

    // Category (シチュエーション)
    let category = '';
    $art.find('div.phrase_archive_single_cat').each((_, catEl) => {
      const text = $(catEl).text().trim();
      if (text.startsWith('シチュエーション:')) {
        const links = $(catEl).find('a[rel="tag"]').map((__, a) => $(a).text().trim()).get();
        category = links.join(' / ');
      }
    });

    // Part of speech (文法)
    let partOfSpeech = '';
    $art.find('div.phrase_archive_single_cat').each((_, catEl) => {
      const text = $(catEl).text().trim();
      if (text.startsWith('文法:')) {
        const $a = $(catEl).find('a[rel="tag"]').first();
        partOfSpeech = $a.length ? $a.text().trim() : text.replace(/^文法:\s*/, '').trim();
      }
    });

    // Explanation: entry-content, strip "Read More" link and trailing ...
    let explanation = '';
    const $content = $art.find('div.entry-content.phrase_archive_single_discription');
    if ($content.length) {
      $content.find('p:has(a[href*="/phrase/"])').remove();
      explanation = $content.text().replace(/\s*\.{2,}\s*$/, '').trim();
    }

    rows.push({
      japanese_translation: japanese,
      phrase,
      category,
      part_of_speech: partOfSpeech,
      explanation,
      detail_url: detailUrl,
    });
  });

  return rows;
}

async function fetchFullExplanation(url) {
  if (!url) return null;
  try {
    const html = await fetchHtml(url);
    const $ = load(html);
    const $desc = $('div.phrase_description');
    if (!$desc.length) return null;

    // Strip non-text content like iframes/scripts/styles
    $desc.find('iframe, script, style').remove();

    const text = $desc.text().replace(/\s+\n/g, '\n').trim();
    return text || null;
  } catch (e) {
    process.stderr.write(`Error fetching detail ${url}: ${e.message}\n`);
    return null;
  }
}

async function main() {
  const { pages, output, incremental } = parseArgs();
  const outPath = path.isAbsolute(output) ? output : path.join(process.cwd(), output);
  const jsonPath = outPath.replace(/\.csv$/i, '.json');

  // Load existing data for incremental mode
  let existing = [];
  let existingMap = new Map();
  if (incremental) {
    existing = loadExisting(jsonPath);
    existingMap = new Map(existing.map((row) => [phraseKey(row), row]));
    console.log(`Incremental mode: loaded ${existing.length} existing phrases from JSON`);
  }

  const listingRows = [];

  console.log(`Scraping up to ${pages} page(s) from ${BASE_URL} ...`);

  for (let p = 1; p <= pages; p++) {
    const url = p === 1 ? `${BASE_URL}/` : `${BASE_URL}/page/${p}/`;
    process.stderr.write(`  Fetching ${url} ... `);
    try {
      const html = await fetchHtml(url);
      const rows = parsePage(html);
      listingRows.push(...rows);
      process.stderr.write(`${rows.length} phrases\n`);
    } catch (e) {
      process.stderr.write(`Error: ${e.message}\n`);
    }
    // Be polite: short delay between requests
    if (p < pages) await new Promise((r) => setTimeout(r, 800));
  }

  // Determine which rows are new (not present in existing JSON)
  let newRows = listingRows;
  if (incremental && existing.length > 0) {
    const seen = existingMap;
    newRows = listingRows.filter((row) => !seen.has(phraseKey(row)));
    console.log(`Found ${newRows.length} new phrase(s) on the site`);
  }

  // Enrich only new rows with full explanations from detail pages
  for (let i = 0; i < newRows.length; i++) {
    const row = newRows[i];
    if (!row.detail_url) continue;
    process.stderr.write(`  Fetching detail ${i + 1}/${newRows.length}: ${row.detail_url} ... `);
    const full = await fetchFullExplanation(row.detail_url);
    if (full) {
      row.explanation = full;
      process.stderr.write('ok\n');
    } else {
      process.stderr.write('skipped\n');
    }
    // Short delay to be polite
    if (i < newRows.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Merge existing + new rows for final output (deduped by phrase key)
  let finalRows;
  if (incremental && existing.length > 0) {
    const merged = new Map();
    // Start with existing data
    for (const row of existing) {
      merged.set(phraseKey(row), row);
    }
    // Overlay / append new rows
    for (const row of newRows) {
      merged.set(phraseKey(row), row);
    }
    finalRows = Array.from(merged.values());
  } else {
    finalRows = listingRows;
  }

  const header = ['japanese_translation', 'phrase', 'category', 'part_of_speech', 'explanation'];
  const csvLines = [header.map(escapeCsvCell).join(',')];
  for (const row of finalRows) {
    csvLines.push(
      header.map((h) => escapeCsvCell(row[h] ?? '')).join(',')
    );
  }

  // Write CSV (for external tools / Excel)
  fs.writeFileSync(outPath, '\uFEFF' + csvLines.join('\n'), 'utf8');

  // Also write JSON next to the CSV for internal use (admin UI, etc.)
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      finalRows.map(({ detail_url, ...rest }) => rest),
      null,
      2
    ),
    'utf8'
  );

  console.log(`Wrote ${finalRows.length} rows to ${outPath}`);
  if (jsonPath !== outPath) {
    console.log(`Wrote JSON data to ${jsonPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
