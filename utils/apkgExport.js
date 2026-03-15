import JSZip from "jszip";

/**
 * APKG Export: build Anki .apkg from deck name, notes (field arrays), and media.
 * Reverses the structure used by apkgParser (ZIP with collection.anki2 + media).
 * Uses sql.js in the browser (same as import).
 *
 * Quiz blocks (single/multi choice, text answer): exported as static text only.
 * Anki has no interactive quiz type, so we render Q + options + answer as plain
 * content on the card. Interactivity (click-to-choose) would require a custom
 * Anki card template with JS and is not supported here.
 */

let SQL = null;

const loadSqlJs = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("sql.js can only be used in browser environment"));
      return;
    }
    if (window.initSqlJs) {
      resolve(window.initSqlJs);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sql.js.org/dist/sql-wasm.js";
    script.async = true;
    script.onload = () => {
      if (window.initSqlJs) resolve(window.initSqlJs);
      else reject(new Error("Failed to load sql.js"));
    };
    script.onerror = () => reject(new Error("Failed to load sql.js from CDN"));
    document.head.appendChild(script);
  });
};

const initSql = async () => {
  if (SQL) return SQL;
  const initSqlJs = await loadSqlJs();
  SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });
  return SQL;
};

/**
 * Convert Deckbase-style field text to Anki HTML.
 * - [audio: x] -> [sound:x]
 * - [image: x] -> <img src="x">
 * - newlines -> <br>
 * - escape HTML entities
 */
function toAnkiFieldHtml(text) {
  if (text == null) return "";
  let s = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  s = s.replace(/\[audio:\s*([^\]]+)\]/g, "[sound:$1]");
  s = s.replace(/\[image:\s*([^\]]+)\]/g, '<img src="$1">');
  s = s.replace(/\n/g, "<br>");
  return s;
}

// Quiz block types: numeric (8,9,10) or string names
function isQuizBlockType(type) {
  const t = type;
  return (
    t === 8 ||
    t === 9 ||
    t === 10 ||
    t === "quizSingleSelect" ||
    t === "quizMultiSelect" ||
    t === "quizTextAnswer" ||
    (typeof t === "string" && (t === "8" || t === "9" || t === "10"))
  );
}

/**
 * Parse quiz block config; returns { question, options?, correct?, correctIndices?, type } for interactive export.
 */
function getQuizBlockData(block, value) {
  const raw =
    block?.configJson ?? block?.config_json ?? value?.configJson ?? value?.config_json;
  let config = raw;
  if (typeof config === "string") {
    try {
      config = JSON.parse(config || "{}");
    } catch {
      return null;
    }
  }
  if (!config || typeof config !== "object") return null;

  const question = (config.question ?? "").trim();
  if (!question) return null;

  const options = Array.isArray(config.options)
    ? config.options.filter((o) => o != null && String(o).trim()).map((o) => String(o).trim())
    : [];
  const type = block?.type;
  const isMulti =
    type === "quizMultiSelect" || type === 8 || type === "8";
  const isText =
    type === "quizTextAnswer" || type === 10 || type === "10";

  if (isText) {
    const correctAnswer =
      (config.correctAnswer ?? (value?.correctAnswers && value.correctAnswers[0]) ?? "").trim();
    return { question, type: "text", correctAnswer };
  }

  if (options.length < 2) return null;

  const valueCorrect = value?.correctAnswers ?? value?.correct_answers;
  const correctAnswers = Array.isArray(config.correctAnswers)
    ? config.correctAnswers
    : Array.isArray(valueCorrect)
      ? valueCorrect
      : [];
  const correctIndices = config.correctAnswerIndices ?? config.correctAnswerIndex;

  let correct = undefined;
  let correctIndicesArr = undefined;
  if (Array.isArray(correctIndices)) {
    correctIndicesArr = correctIndices.filter(
      (i) => typeof i === "number" && i >= 0 && i < options.length
    );
  } else if (typeof correctIndices === "number" && correctIndices >= 0 && correctIndices < options.length) {
    correct = correctIndices;
  } else if (correctAnswers.length > 0) {
    const set = new Set(correctAnswers.map((c) => String(c).trim()).filter(Boolean));
    correctIndicesArr = options.map((o, i) => (set.has(o) ? i : -1)).filter((i) => i >= 0);
  }

  if (isMulti && correctIndicesArr && correctIndicesArr.length > 0) {
    return { question, options, correctIndices: correctIndicesArr, type: "multi" };
  }
  if ((!isMulti && correct !== undefined) || (!isMulti && correctIndicesArr?.length === 1)) {
    const singleCorrect = correct !== undefined ? correct : correctIndicesArr[0];
    return { question, options, correct: singleCorrect, type: "single" };
  }
  return null;
}

/**
 * Export quiz block as static text (fallback when no options or for text-answer).
 */
function quizBlockToText(block, value) {
  const data = getQuizBlockData(block, value);
  if (!data) return "";

  const lines = [`Q: ${data.question}`];
  if (data.options && data.options.length > 0) {
    lines.push("Options: " + data.options.map((o, i) => `${i + 1}. ${o}`).join(" "));
    if (data.type === "single" && data.correct !== undefined) {
      lines.push("Answer: " + data.options[data.correct]);
    } else if (data.type === "multi" && data.correctIndices?.length) {
      lines.push("Answer: " + data.correctIndices.map((i) => data.options[i]).join(", "));
    }
  }
  if (data.type === "text" && data.correctAnswer) {
    lines.push("Answer: " + data.correctAnswer);
  }
  return lines.join("\n");
}

/** Escape for HTML attribute value */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build HTML for a selectable quiz (single/multi). Embeds JSON in data-deckbase-quiz so the
 * Anki card template script can render clickable options. Fallback text shown if script doesn't run.
 */
function quizBlockToInteractiveHtml(block, value) {
  const data = getQuizBlockData(block, value);
  if (!data || !data.options || data.options.length < 2) {
    return toAnkiFieldHtml(quizBlockToText(block, value));
  }
  try {
    const payload = escapeAttr(btoa(encodeURIComponent(JSON.stringify(data))));
    const fallback = toAnkiFieldHtml(quizBlockToText(block, value));
    return `<span class="deckbase-quiz" data-deckbase-quiz="${payload}">${fallback}</span>`;
  } catch {
    return toAnkiFieldHtml(quizBlockToText(block, value));
  }
}

/**
 * Build one Anki note's field array (HTML strings) from a Deckbase card.
 * blocksSnapshot defines order; values provide text/mediaIds.
 * mediaIdToFilename: map of mediaId -> filename used in APKG media (e.g. "0.mp3").
 * Quiz blocks are exported as static Q/Options/Answer text (Anki has no interactive quiz type).
 */
function cardToAnkiFields(card, mediaIdToFilename) {
  const blocks = card.blocksSnapshot || [];
  const valueByBlockId = {};
  for (const v of card.values || []) {
    valueByBlockId[v.blockId] = v;
  }

  const isAudioBlock = (b) => {
    const t = b?.type;
    return t === "audio" || t === 7 || (typeof t === "string" && t === "7");
  };
  const isImageBlock = (b) => {
    const t = b?.type;
    return t === "image" || t === 6 || (typeof t === "string" && t === "6");
  };

  const mediaIdsFor = (v) => {
    const ids = v?.mediaIds ?? v?.media_ids;
    return Array.isArray(ids) ? ids : [];
  };

  return blocks.map((block) => {
    const v = valueByBlockId[block.blockId];

    if (isQuizBlockType(block?.type)) {
      return quizBlockToInteractiveHtml(block, v || {});
    }

    if (!v) return "";

    let html = (v.text || "").trim();
    const ids = mediaIdsFor(v);

    if (isAudioBlock(block) && ids.length) {
      const fname = mediaIdToFilename[ids[0]];
      if (fname) html += (html ? " " : "") + `[sound:${fname}]`;
    }
    if (isImageBlock(block) && ids.length) {
      const fname = mediaIdToFilename[ids[0]];
      if (fname) html += (html ? "<br>" : "") + `<img src="${fname}">`;
    }

    return toAnkiFieldHtml(html);
  });
}

/**
 * Collect all media IDs from cards (stable order) and return list of { mediaId, suggestedExt }.
 */
function collectMediaIds(cards) {
  const seen = new Set();
  const list = [];
  const isAudioBlock = (b) => b?.type === "audio" || b?.type === 7 || (typeof b?.type === "string" && b?.type === "7");
  const isImageBlock = (b) => b?.type === "image" || b?.type === 6 || (typeof b?.type === "string" && b?.type === "6");

  for (const card of cards) {
    const blocks = card.blocksSnapshot || [];
    for (const v of card.values || []) {
      const ids = Array.isArray(v?.mediaIds) ? v.mediaIds : (Array.isArray(v?.media_ids) ? v.media_ids : []);
      if (!ids.length) continue;
      const block = blocks.find((b) => b.blockId === v.blockId);
      const ext = block && isAudioBlock(block) ? "mp3" : "jpg";
      for (const mid of ids) {
        if (seen.has(mid)) continue;
        seen.add(mid);
        list.push({ mediaId: mid, suggestedExt: ext });
      }
    }
  }
  if (list.length === 0 && cards.length > 0) {
    const firstValues = (cards[0].values || []).map((v) => ({
      blockId: v.blockId,
      type: v.type,
      hasMediaIds: !!v.mediaIds?.length,
      hasMedia_ids: !!v.media_ids?.length,
    }));
    console.log("[APKG Export] collectMediaIds: no media found; first card values sample", firstValues);
  }
  return list;
}

/**
 * Script that finds .deckbase-quiz[data-deckbase-quiz] and replaces with interactive buttons.
 * Shared by question and answer templates so quiz works on front or back.
 */
function getDeckbaseQuizScript() {
  return (
    "(function() {\n" +
    "  var el = document.getElementById('deckbase-back') || document.getElementById('deckbase-front');\n" +
    "  if (!el) return;\n" +
    "  var spans = el.querySelectorAll('.deckbase-quiz[data-deckbase-quiz]');\n" +
    "  for (var i = 0; i < spans.length; i++) {\n" +
    "    var span = spans[i];\n" +
    "    var raw = span.getAttribute('data-deckbase-quiz');\n" +
    "    if (!raw) continue;\n" +
    "    try {\n" +
    "      var json = JSON.parse(decodeURIComponent(atob(raw)));\n" +
    "      var q = json.question;\n" +
    "      var opts = json.options || [];\n" +
    "      var correct = json.correct;\n" +
    "      var correctIndices = json.correctIndices || [];\n" +
    "      var multi = json.type === 'multi';\n" +
    "      function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }\n" +
    "      var html = '<p><strong>Q: ' + esc(q) + '</strong></p><ul style=\"list-style:none;padding:0;margin:8px 0\">';\n" +
    "      for (var j = 0; j < opts.length; j++) {\n" +
    "        var isCorrect = multi ? correctIndices.indexOf(j) >= 0 : correct === j;\n" +
    "        html += '<li style=\"margin:6px 0\"><button type=\"button\" class=\"deckbase-quiz-opt\" data-idx=\"' + j + '\" data-correct=\"' + isCorrect + '\" style=\"padding:8px 12px;width:100%;text-align:left;cursor:pointer;border:1px solid #ccc;border-radius:6px;background:#fff;font-size:16px\">' + esc(opts[j]) + '</button></li>';\n" +
    "      }\n" +
    "      var answerText = multi ? correctIndices.map(function(idx) { return opts[idx]; }).map(esc).join(', ') : (opts[correct] ? esc(opts[correct]) : '');\n" +
    "      html += '</ul><p class=\"deckbase-quiz-answer\" style=\"display:none;margin-top:8px;font-weight:bold;color:green\">Answer: ' + answerText + '</p>';\n" +
    "      span.innerHTML = html;\n" +
    "      span.querySelectorAll('.deckbase-quiz-opt').forEach(function(btn) {\n" +
    "        btn.addEventListener('click', function() {\n" +
    "          if (this.disabled) return;\n" +
    "          var correct = this.getAttribute('data-correct') === 'true';\n" +
    "          this.style.background = correct ? '#d4edda' : '#f8d7da';\n" +
    "          this.style.borderColor = correct ? '#28a745' : '#dc3545';\n" +
    "          this.disabled = true;\n" +
    "          var answerEl = span.querySelector('.deckbase-quiz-answer');\n" +
    "          if (answerEl) answerEl.style.display = 'block';\n" +
    "        });\n" +
    "      });\n" +
    "    } catch (e) {}\n" +
    "  }\n" +
    "})();\n"
  );
}

/** Question template: Front (with quiz/audio) wrapped so script can make quiz interactive. */
function getQuestionTemplateWithQuizScript() {
  return (
    '<div id="deckbase-front">{{Front}}</div>\n' +
    "<script>\n" +
    getDeckbaseQuizScript() +
    "</script>"
  );
}

/**
 * Answer template that wraps Back in a div and runs a script to make .deckbase-quiz blocks
 * interactive (clickable options, green/red feedback). Used so exported quiz blocks are selectable in Anki.
 */
function getAnswerTemplateWithQuizScript() {
  return (
    '{{FrontSide}}\n\n<hr id="answer">\n\n<div id="deckbase-back">{{Back}}</div>\n' +
    "<script>\n" +
    getDeckbaseQuizScript() +
    "</script>"
  );
}

/**
 * Build SQLite DB bytes for Anki collection.
 * @param {Object} opts
 * @param {string} opts.deckName
 * @param {string[]} opts.fieldNames - e.g. ["Front", "Back"]
 * @param {Array<{ id: number, guid: string, fields: string[] }>} opts.notes - each note has id, guid, fields (HTML)
 * @param {number} opts.modelId - model id (epoch ms)
 * @param {number} opts.deckId - deck id (1 for default)
 */
function buildCollectionDb(opts) {
  const { deckName, fieldNames, notes, modelId, deckId } = opts;
  const db = new SQL.Database();

  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  // col: single row
  const conf = JSON.stringify({
    curDeck: deckId,
    activeDecks: [deckId],
    newSpread: 0,
    collapseTime: 1200,
    timeLim: 0,
    estTimes: true,
    dueCounts: true,
    curModel: String(modelId),
    nextPos: 1,
    sortType: "noteFld",
    sortBackwards: false,
    addToCur: true,
  });

  const decks = JSON.stringify({
    [String(deckId)]: {
      id: deckId,
      name: deckName,
      mod: nowSec,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: true,
      dyn: 0,
      conf: 1,
      extendNew: 0,
      extendRev: 0,
      desc: "",
      md: false,
    },
  });

  const dconf = JSON.stringify({
    "1": {
      id: 1,
      name: "Default",
      mod: nowSec,
      usn: -1,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: {
        perDay: 20,
        delays: [1, 10],
        order: 1,
        fuzz: 0.05,
        bury: false,
        initialFactor: 2500,
        ints: [1, 4],
        separate: false,
      },
      lapse: {
        mult: 1,
        minInt: 1,
        leechFails: 8,
        delays: [10],
        leechAction: 1,
      },
      rev: {
        perDay: 200,
        fuzz: 0.05,
        ivlFct: 1,
        maxIvl: 36500,
        bury: false,
        ease4: 1.3,
        minSpace: 1,
      },
    },
  });

  // Anki Basic template expects exactly "Front" and "Back" for first two fields. Use those names
  // so the template works; any extra fields get Extra1, Extra2, ...
  const ankiFieldNames = fieldNames.map((_, i) => {
    if (i === 0) return "Front";
    if (i === 1) return "Back";
    return `Extra${i - 1}`;
  });

  const flds = ankiFieldNames.map((name, ord) => ({
    name,
    ord,
    sticky: false,
    rtl: false,
    font: "Arial",
    size: 12,
    media: [],
  }));

  const models = JSON.stringify({
    [String(modelId)]: {
      id: modelId,
      name: "Basic",
      type: 0,
      mod: nowSec,
      usn: -1,
      sortf: 0,
      did: deckId,
      flds,
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: getQuestionTemplateWithQuizScript(),
          afmt: getAnswerTemplateWithQuizScript(),
          bqfmt: "",
          bafmt: "",
          did: null,
        },
      ],
      req: [[0, "all", [0, 1]]],
      css: ".card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n",
      latexPre: "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
      latexPost: "\\end{document}",
      latexsvg: false,
      vers: [],
      tags: [],
    },
  });

  db.run(
    `CREATE TABLE col (
      id INTEGER PRIMARY KEY,
      crt INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      scm INTEGER NOT NULL,
      ver INTEGER NOT NULL,
      dty INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ls INTEGER NOT NULL,
      conf TEXT NOT NULL,
      models TEXT NOT NULL,
      decks TEXT NOT NULL,
      dconf TEXT NOT NULL,
      tags TEXT NOT NULL
    )`
  );
  db.run(
    `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
     VALUES (1, ?, ?, 0, 11, 0, -1, 0, ?, ?, ?, ?, '{}')`,
    [nowSec, nowMs, conf, models, decks, dconf]
  );

  // notes
  db.run(
    `CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      guid TEXT NOT NULL,
      mid INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      tags TEXT NOT NULL,
      flds TEXT NOT NULL,
      sfld INTEGER NOT NULL,
      csum INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    )`
  );
  db.run("CREATE INDEX ix_notes_usn ON notes (usn)");
  db.run("CREATE INDEX ix_notes_csum ON notes (csum)");

  for (const note of notes) {
    const fldsStr = note.fields.join("\x1f");
    db.run(
      `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
       VALUES (?, ?, ?, ?, -1, ' ', ?, 0, 0, 0, '')`,
      [note.id, note.guid, modelId, nowSec, fldsStr]
    );
  }

  // cards: one card per note
  db.run(
    `CREATE TABLE cards (
      id INTEGER PRIMARY KEY,
      nid INTEGER NOT NULL,
      did INTEGER NOT NULL,
      ord INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      type INTEGER NOT NULL,
      queue INTEGER NOT NULL,
      due INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      \`left\` INTEGER NOT NULL,
      odue INTEGER NOT NULL,
      odid INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    )`
  );
  db.run("CREATE INDEX ix_cards_nid ON cards (nid)");
  db.run("CREATE INDEX ix_cards_sched ON cards (did, queue, due)");
  db.run("CREATE INDEX ix_cards_usn ON cards (usn)");

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const cardId = nowMs + i + 1;
    db.run(
      `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, \`left\`, odue, odid, flags, data)
       VALUES (?, ?, ?, 0, ?, -1, 0, 0, 1, 0, 2500, 0, 0, 0, 0, 0, 0, '')`,
      [cardId, note.id, deckId, nowSec]
    );
  }

  // graves: deleted cards/notes/decks for sync (empty for new export)
  db.run(
    `CREATE TABLE graves (
      usn INTEGER NOT NULL,
      oid INTEGER NOT NULL,
      type INTEGER NOT NULL
    )`
  );

  // revlog: review history (empty for new export)
  db.run(
    `CREATE TABLE revlog (
      id INTEGER PRIMARY KEY,
      cid INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ease INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      lastIvl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      time INTEGER NOT NULL,
      type INTEGER NOT NULL
    )`
  );
  db.run("CREATE INDEX ix_revlog_usn ON revlog (usn)");
  db.run("CREATE INDEX ix_revlog_cid ON revlog (cid)");

  const data = db.export();
  db.close();
  return data;
}

/**
 * Export deck to APKG blob.
 * @param {Object} opts
 * @param {string} opts.deckName
 * @param {Array} opts.cards - Deckbase cards (blocksSnapshot, values)
 * @param {string[]} [opts.fieldNames] - optional; default from first card blocksSnapshot labels
 * @param {function(string): Promise<Uint8Array|null>} opts.getMediaBytes - async (mediaId) => bytes or null
 */
export async function exportApkgToBlob(opts) {
  await initSql();

  const { deckName, cards, getMediaBytes } = opts;
  if (!cards?.length) {
    throw new Error("No cards to export");
  }

  const blocks = cards[0].blocksSnapshot || [];
  const fieldNames = opts.fieldNames || blocks.map((b) => b.label || b.blockId || "Field") || ["Front", "Back"];

  const mediaList = collectMediaIds(cards);
  console.log("[APKG Export] collectMediaIds", { total: mediaList.length, sample: mediaList.slice(0, 3) });
  const mediaIdToFilename = {};
  const mediaFiles = {};
  const mediaMapping = {};
  let mediaIndex = 0;
  for (const { mediaId, suggestedExt } of mediaList) {
    const bytes = await getMediaBytes(mediaId);
    if (!bytes) {
      console.warn("[APKG Export] skip media (no bytes)", { mediaId, suggestedExt });
      continue;
    }
    const numId = String(mediaIndex);
    const filename = `media_${mediaIndex}.${suggestedExt}`;
    mediaIndex += 1;
    mediaIdToFilename[mediaId] = filename;
    mediaMapping[numId] = filename;
    mediaFiles[numId] = bytes;
    console.log("[APKG Export] media added", { mediaId, filename, bytesLength: bytes.length });
  }
  console.log("[APKG Export] media summary", { fetched: Object.keys(mediaIdToFilename).length, skipped: mediaList.length - Object.keys(mediaIdToFilename).length });

  const modelId = Date.now();
  const deckId = 1;

  // Front = first block + all quiz blocks + all audio blocks; Back = everything else.
  const isAudioBlock = (b) => {
    const t = b?.type;
    return t === "audio" || t === 7 || (typeof t === "string" && t === "7");
  };
  const collapseToFrontBack = (card, fields) => {
    if (!fields || fields.length === 0) return ["", ""];
    const blocks = card.blocksSnapshot || [];
    const frontParts = [];
    const backParts = [];
    for (let i = 0; i < fields.length; i++) {
      const block = blocks[i];
      const isFirst = i === 0;
      const isQuiz = block && isQuizBlockType(block.type);
      const isAudio = block && isAudioBlock(block);
      const html = (fields[i] || "").trim();
      if (isFirst || isQuiz || isAudio) frontParts.push(html);
      else backParts.push(html);
    }
    return [frontParts.filter(Boolean).join("<br>"), backParts.filter(Boolean).join("<br>")];
  };

  const notes = [];
  const baseId = modelId + 1;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const allFields = cardToAnkiFields(card, mediaIdToFilename);
    const fields = collapseToFrontBack(card, allFields);
    const id = baseId + i;
    notes.push({
      id,
      guid: `${id.toString(36)}${Math.random().toString(36).slice(2, 10)}`,
      fields,
    });
  }
  if (notes.length > 0) {
    const firstFields = notes[0].fields;
    const hasSound = firstFields.some((f) => typeof f === "string" && f.includes("[sound:"));
    console.log("[APKG Export] first note fields sample", {
      fieldCount: firstFields.length,
      hasSoundTag: hasSound,
      field0Preview: (firstFields[0] || "").slice(0, 120),
      field1Preview: (firstFields[1] || "").slice(0, 120),
    });
  }

  const dbBytes = buildCollectionDb({
    deckName,
    fieldNames: ["Front", "Back"],
    notes,
    modelId,
    deckId,
  });

  const zip = new JSZip();
  zip.file("collection.anki2", dbBytes);

  // Anki expects media and numeric media files to be stored uncompressed in the ZIP
  const noCompress = { compression: "STORE" };
  if (Object.keys(mediaMapping).length) {
    zip.file("media", JSON.stringify(mediaMapping), noCompress);
    for (const [numId, bytes] of Object.entries(mediaFiles)) {
      zip.file(numId, bytes, noCompress);
    }
    console.log("[APKG Export] zip media files", { count: Object.keys(mediaFiles).length, mapping: mediaMapping });
  } else {
    console.log("[APKG Export] zip has no media files");
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const mediaTotalBytes = Object.values(mediaFiles).reduce(
    (sum, b) => sum + (b?.length ?? 0),
    0
  );
  console.log("[APKG Export] size breakdown", {
    dbBytes: dbBytes?.length ?? 0,
    mediaTotalBytes,
    mediaFileCount: Object.keys(mediaFiles).length,
    blobSize: blob?.size ?? 0,
  });

  return blob;
}
