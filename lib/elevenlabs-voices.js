/**
 * Shared ElevenLabs TTS voice options for web and mobile API.
 * Curated catalog matches `docs/api/ELEVENLABS_VOICES.md` (Quick Reference).
 * Used by: card editor UI, GET /api/elevenlabs/voices, voice-sample whitelist, MCP list_elevenlabs_voices.
 *
 * Voice previews: Firebase Storage `{ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX}/{voiceId}.mp3` — sample text is
 * per-language (`getElevenlabsSamplePhraseForVoiceId`); first GET generates once, then serves from Storage.
 */

/** [iso639 code, group label, female voice id, male voice id] — order matches Quick Reference */
const CURATED_LANGS = [
  ["ar", "Arabic", "4wf10lgibMnboGJGCLrP", "xvhpbk8otnNHtT3fjCpr"],
  ["bg", "Bulgarian", "M1ydWt7KnBCiuv4CnEDC", "gdk0ZsvfAOobfbTtnx6p"],
  ["zh", "Chinese (Mandarin)", "4NQthjVhIGGVfL3Si000", "agczkAUlHLowaNnL72Cc"],
  ["hr", "Croatian", "FXlzTee7Zx2caYKIAwBF", "TRnNlYQWHAJwo9K75wNE"],
  ["cs", "Czech", "e6RzI8kmgjn6nh36K9J3", "oJafrcmhnPdknhWvAMQq"],
  ["da", "Danish", "4RklGmuxoAskAbGXplXN", "ADRrvIX3j1uTFlD5q6DE"],
  ["nl", "Dutch", "OlBRrVAItyi00MuGMbna", "Jn7U4vF8ZkmjZIZRn4Uk"],
  ["en", "English", "owHnXhz2H7U5Cv31srDU", "GrVxA7Ub86nJH91Viyiv"],
  ["fil", "Filipino", "x67weArB3J1Pw9MN46KC", "XZXkjLOwX1a5QsrVLIzM"],
  ["fi", "Finnish", "c4ZwDxrFaobUF5e1KlEM", "XFCwH7g0WlOZiFnelted"],
  ["fr", "French", "mlIQEcTmPRMIHZApujDD", "243EYe3yd01qZNlIuged"],
  ["de", "German", "idJJAzG7sSMi0HPB4sBL", "KDqku3FJfbImX6HKQdWA"],
  ["el", "Greek", "JrrE7QTGDmQKQuUnqk7H", "ejJ1ETWS2ohLMMeCu1H3"],
  ["hi", "Hindi", "MF4J4IDTRo0AxOO4dpFR", "QCwUVw5fOJzf8t55fhmR"],
  ["hu", "Hungarian", "xjlfQQ3ynqiEyRpArrT8", "TumdjBNWanlT3ysvclWh"],
  ["id", "Indonesian", "tkD44aBEYVXxC4GxZoBV", "YaOJRohVGQB7O7pekQTF"],
  ["it", "Italian", "Ifz6upLTTyg10iqpfWL5", "f8NAZK1ciwrVujah7clz"],
  ["ja", "Japanese", "Z5Rahxh8jMhJKEgBfCSS", "94gBdmmazJ025HbvF78b"],
  ["ko", "Korean", "airYK6ydeWdrJg6gyZA3", "fHzGR8qcnsDR2uaj9r16"],
  ["ms", "Malay", "vzENlyfJ5X29uOlVQMWY", "Wc6X61hTD7yucJMheuLN"],
  ["no", "Norwegian", "k5IgYJw2jfo6mO5HhagG", "EpYEY8MWJrUGskHBoNMA"],
  ["pl", "Polish", "aAY9hMI6VU335JUszdRs", "B5tmTXp0L7DzqmlGqIMJ"],
  ["pt", "Portuguese", "GDzHdQOi6jjf8zaXhCYD", "ZxhW0J5Q17DnNxZM6VDC"],
  ["ro", "Romanian", "mSQ52FoQiuRydZA1FOpg", "9nKRcmsd1bEJbszIZ2HO"],
  ["ru", "Russian", "Qd4oZ0qGYYI8dkiby8he", "13JzN9jg1ViUP8Pf3uet"],
  ["sk", "Slovak", "9Nd358gE1qQp0pDh8FgP", "DXwrzy2wtKORwDTbsMwk"],
  ["es", "Spanish", "rnktyBnYiJ9gGJSNsJZn", "VvYiNBPylZtUh8Bf6u8l"],
  ["sv", "Swedish", "4Ct5uMEndw4cJ7q0Jx0l", "ouhIFI5XkmBelRRcJe51"],
  ["ta", "Tamil", "IC6fkbI5BN65xFmhUCbY", "yrFqUM5ku2rYJCdiBKFU"],
  ["tr", "Turkish", "FDs1ZX5J4e4f2c2erxtW", "Q5n6GDIjpN0pLOlycRFT"],
  ["uk", "Ukrainian", "5erHrdsmUNM63rFLhYiV", "0CH1jv2shWMGGZ3uM0rX"],
  ["vi", "Vietnamese", "D0dFzCacaMgMGjIksFuH", "7clfgAuss1M0JUYGlh1t"],
];

export const ELEVENLABS_VOICES = CURATED_LANGS.flatMap(([language, group, femaleId, maleId]) => [
  {
    group,
    label: `${group} (female)`,
    id: femaleId,
    gender: "female",
    accent: "standard",
    language,
  },
  {
    group,
    label: `${group} (male)`,
    id: maleId,
    gender: "male",
    accent: "standard",
    language,
  },
]);

/**
 * Normalize a voice row for UI filters (gender, accent, language).
 * @param {object} v
 * @returns {{ id: string, label: string, group: string, gender: string, accent: string, language: string }}
 */
export function normalizeElevenlabsVoiceForFilters(v) {
  const id = String(v?.id ?? "");
  const label = String(v?.label ?? v?.name ?? id);
  const group = String(v?.group ?? "");
  let gender = String(v?.gender ?? "").toLowerCase().trim();
  let accent = String(v?.accent ?? v?.country ?? "").toLowerCase().trim();
  let language = String(v?.language ?? "").toLowerCase().trim();
  if (!gender && label) {
    if (/\bfemale\b/i.test(label)) gender = "female";
    else if (/\bmale\b/i.test(label)) gender = "male";
  }
  if (!accent && group) {
    accent = group.split(/[·|,]/)[0]?.trim().toLowerCase() || group.toLowerCase();
  }
  return { ...v, id, label, group, gender, accent, language };
}

/** Deckbase curated voices only (normalized, sorted by language group then gender). */
export function getCuratedVoicesNormalized() {
  const rows = ELEVENLABS_VOICES.map((v) => normalizeElevenlabsVoiceForFilters(v));
  rows.sort((a, b) => {
    const g = a.group.localeCompare(b.group);
    if (g !== 0) return g;
    const gf = (a.gender === "female" ? 0 : 1) - (b.gender === "female" ? 0 : 1);
    if (gf !== 0) return gf;
    return a.label.localeCompare(b.label);
  });
  return rows;
}

/** English default when language is unknown (should not happen for curated ids). */
export const ELEVENLABS_SAMPLE_PHRASE = "Hello, this is a sample of this voice.";

/**
 * One short preview line per curated language (native text) — same meaning as {@link ELEVENLABS_SAMPLE_PHRASE}.
 * ElevenLabs reads whatever text we send; English for all voices made non-English picks sound like “English with an accent”.
 */
export const ELEVENLABS_SAMPLE_PHRASE_BY_LANGUAGE = {
  ar: "مرحبًا، هذا عيّنة من هذا الصوت.",
  bg: "Здравейте, това е пример за този глас.",
  zh: "你好，这是这款声音的样本。",
  hr: "Bok, ovo je uzorak ovog glasa.",
  cs: "Ahoj, tohle je ukázka tohoto hlasu.",
  da: "Hej, dette er en prøve af denne stemme.",
  nl: "Hallo, dit is een voorbeeld van deze stem.",
  en: ELEVENLABS_SAMPLE_PHRASE,
  fil: "Kumusta, ito ay halimbawa ng tinig na ito.",
  fi: "Hei, tämä on näyte tästä äänestä.",
  fr: "Bonjour, voici un échantillon de cette voix.",
  de: "Hallo, dies ist eine Stimmprobe dieser Stimme.",
  el: "Γεια σας, αυτό είναι δείγμα αυτής της φωνής.",
  hi: "नमस्ते, यह इस आवाज़ का नमूना है।",
  hu: "Helló, ez ennek a hangnak a mintája.",
  id: "Halo, ini sampel suara ini.",
  it: "Ciao, questo è un campione di questa voce.",
  ja: "こんにちは、これはこの声のサンプルです。",
  ko: "안녕하세요, 이 목소리의 샘플입니다.",
  ms: "Helo, ini ialah sampel suara ini.",
  no: "Hei, dette er et eksempel på denne stemmen.",
  pl: "Cześć, to jest próbka tego głosu.",
  pt: "Olá, esta é uma amostra desta voz.",
  ro: "Bună, aceasta este o mostră a acestei voci.",
  ru: "Здравствуйте, это образец этого голоса.",
  sk: "Ahoj, toto je ukážka tohto hlasu.",
  es: "Hola, esta es una muestra de esta voz.",
  sv: "Hej, det här är ett prov på den här rösten.",
  ta: "வணக்கம், இது இந்தக் குரலின் மாதிரி.",
  tr: "Merhaba, bu sesin bir örneği.",
  uk: "Привіт, це зразок цього голосу.",
  vi: "Xin chào, đây là mẫu của giọng nói này.",
};

/**
 * @param {string} voiceId
 * @returns {string}
 */
export function getElevenlabsSamplePhraseForVoiceId(voiceId) {
  const id = String(voiceId ?? "").trim();
  if (!id) return ELEVENLABS_SAMPLE_PHRASE;
  const row = ELEVENLABS_VOICES.find((v) => v.id === id);
  const lang = row?.language ? String(row.language).toLowerCase().trim() : "";
  const phrase = lang ? ELEVENLABS_SAMPLE_PHRASE_BY_LANGUAGE[lang] : "";
  return phrase || ELEVENLABS_SAMPLE_PHRASE;
}

/**
 * Firebase Storage folder for cached MP3 previews (must match seed script + GET /api/elevenlabs/voice-sample).
 * Bumped when sample text changes so old English-only clips are not reused.
 */
export const ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX = "tts-samples-v2";

/** Model used for preview clips (multilingual; matches POST /api/elevenlabs/text-to-speech). */
export const ELEVENLABS_VOICE_SAMPLE_MODEL_ID = "eleven_multilingual_v2";

/** Default voice when env is unset (matches lib/elevenlabs-server.js / text-to-speech route). */
export const ELEVENLABS_SERVER_FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/** Docs link for assistants and clients. */
export const ELEVENLABS_DOCS_URL = "https://elevenlabs.io/docs";

/**
 * Resolve voices for MCP and default GET /api/elevenlabs/voices (always curated catalog).
 * @returns {Promise<{ voices: Array<{ id: string, label: string, group: string }>, source: "static_curated", note?: string }>}
 */
export async function resolveElevenlabsVoicesList() {
  const hasKey = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  return {
    voices: getCuratedVoicesNormalized(),
    source: "static_curated",
    note: hasKey
      ? undefined
      : `ELEVENLABS_API_KEY is not set; TTS generation still requires this key on the server. Voice list is the Deckbase curated catalog (docs/api/ELEVENLABS_VOICES.md). ${ELEVENLABS_DOCS_URL}`,
  };
}

/** ISO 639 code + display name for MCP filters (sorted by name). */
export function getCuratedLanguageOptionsForMcp() {
  return CURATED_LANGS.map(([code, name]) => ({ code, name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

const VALID_MCP_GENDERS = new Set(["female", "male"]);

/**
 * Normalize MCP tool args for list_elevenlabs_voices.
 * @param {object} [raw]
 * @returns {{ language?: string, gender?: string, search?: string }}
 */
export function normalizeElevenlabsVoiceListFilters(raw = {}) {
  const language =
    raw.language != null && String(raw.language).trim()
      ? String(raw.language).toLowerCase().trim()
      : undefined;
  const g = raw.gender != null ? String(raw.gender).toLowerCase().trim() : "";
  const gender = VALID_MCP_GENDERS.has(g) ? g : undefined;
  const search =
    raw.search != null && String(raw.search).trim() ? String(raw.search).trim() : undefined;
  return { language, gender, search };
}

/**
 * Apply optional language, gender, and substring search (label, group, id, language code).
 * @param {Array<object>} voices - normalized curated rows
 * @param {{ language?: string, gender?: string, search?: string }} filters
 */
export function filterVoicesForMcp(voices, filters = {}) {
  const { language, gender, search } = normalizeElevenlabsVoiceListFilters(filters);
  const q = search != null ? search.toLowerCase().trim() : "";
  return voices.filter((v) => {
    if (language && v.language !== language) return false;
    if (gender && v.gender !== gender) return false;
    if (q) {
      const hay = `${v.label} ${v.group} ${v.id} ${v.language}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Resolve ElevenLabs voice id for MCP tools that generate audio: pass `voice_id` OR `audio_language` + `audio_gender`.
 * @param {object} [options]
 * @returns {{ ok: true, voiceId: string, via: "voice_id" | "audio_language_gender" } | { ok: false, message: string }}
 */
export function resolveVoiceIdForMcpTts(options = {}) {
  const vid = String(options.voice_id ?? options.voiceId ?? "").trim();
  if (vid) {
    const row = ELEVENLABS_VOICES.find((v) => v.id === vid);
    if (row) {
      return { ok: true, voiceId: vid, via: "voice_id" };
    }
    return {
      ok: false,
      message:
        "voice_id is not in the Deckbase curated catalog. Call list_elevenlabs_voices, or pass audio_language (ISO 639) and audio_gender (female|male).",
    };
  }
  const lang = String(options.audio_language ?? options.audioLanguage ?? "").toLowerCase().trim();
  const gRaw = String(options.audio_gender ?? options.audioGender ?? "").toLowerCase().trim();
  const g = gRaw === "female" || gRaw === "male" ? gRaw : "";
  if (!lang || !g) {
    return {
      ok: false,
      message:
        "Before generating audio, ask the user for voice settings, then pass voice_id from list_elevenlabs_voices, or pass audio_language (ISO 639, e.g. en, uk, fil) and audio_gender (female or male). Or set generate_audio: false to skip TTS.",
    };
  }
  const row = ELEVENLABS_VOICES.find((v) => v.language === lang && v.gender === g);
  if (!row) {
    return {
      ok: false,
      message: `No curated voice for language "${lang}" and gender "${g}". Call list_elevenlabs_voices (use language + gender filters).`,
    };
  }
  return { ok: true, voiceId: row.id, via: "audio_language_gender" };
}

/**
 * Payload for MCP `list_elevenlabs_voices` and assistants that need voice ids.
 * @param {object} [toolArgs] - optional `language` (ISO 639), `gender` (female|male), `search` (substring)
 * @returns {Promise<object>}
 */
export async function getElevenlabsVoicesMcpPayload(toolArgs = {}) {
  const resolved = await resolveElevenlabsVoicesList();
  const all = resolved.voices;
  const normalized = normalizeElevenlabsVoiceListFilters(toolArgs);
  const filtered = filterVoicesForMcp(all, normalized);
  const filtersApplied = /** @type {Record<string, string>} */ ({});
  if (normalized.language) filtersApplied.language = normalized.language;
  if (normalized.gender) filtersApplied.gender = normalized.gender;
  if (normalized.search) filtersApplied.search = normalized.search;

  return {
    ...resolved,
    voices: filtered,
    totalVoicesInCatalog: all.length,
    filtersApplied,
    languageOptions: getCuratedLanguageOptionsForMcp(),
    defaultVoiceIdFromEnv: process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim() || null,
    serverFallbackVoiceId: ELEVENLABS_SERVER_FALLBACK_VOICE_ID,
    hint:
      "Use each voice's id as voice_id on create_card / attach_audio_to_card, or pass audio_language + audio_gender instead. " +
      "list_elevenlabs_voices optional args: language, gender, search. " +
      "defaultVoiceId in template audio blocks is for the dashboard; MCP TTS still requires voice_id or audio_language+audio_gender when generating.",
    docsUrl: ELEVENLABS_DOCS_URL,
  };
}
