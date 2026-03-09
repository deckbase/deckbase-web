/**
 * ASO listing-based analysis: keyword presence and placement in store listing fields.
 * Used by the ASO pipeline to score opportunities (high/medium/low) and suggest actions.
 */

function normalize(text) {
  if (text == null || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if keyword appears in text (case-insensitive substring).
 * @param {string} keyword
 * @param {string} text
 * @returns {boolean}
 */
function appearsIn(keyword, text) {
  const k = normalize(keyword);
  const t = normalize(text);
  if (!k || !t) return false;
  return t.includes(k);
}

/**
 * Analyze where a keyword appears in Android and iOS listing fields.
 * @param {string} keyword
 * @param {{ title?: string, shortDescription?: string, fullDescription?: string } | null} listingAndroid - en-US or first locale
 * @param {{ appName?: string, subtitle?: string, keywords?: string, description?: string, promotionalText?: string } | null} listingIos - en-US or first locale
 * @returns {{
 *   inListing: boolean,
 *   inAndroid: boolean,
 *   inIos: boolean,
 *   placementAndroid: string | null,
 *   placementIos: string | null,
 *   inAndroidTitle: boolean,
 *   inAndroidShort: boolean,
 *   inAndroidFull: boolean,
 *   inIosSubtitle: boolean,
 *   inIosKeywords: boolean,
 *   inIosDescription: boolean,
 *   inIosPromo: boolean,
 * }}
 */
export function analyzeKeywordPlacement(keyword, listingAndroid, listingIos) {
  const result = {
    inListing: false,
    inAndroid: false,
    inIos: false,
    placementAndroid: null,
    placementIos: null,
    inAndroidTitle: false,
    inAndroidShort: false,
    inAndroidFull: false,
    inIosSubtitle: false,
    inIosKeywords: false,
    inIosDescription: false,
    inIosPromo: false,
  };

  if (listingAndroid) {
    const { title = "", shortDescription = "", fullDescription = "" } = listingAndroid;
    result.inAndroidTitle = appearsIn(keyword, title);
    result.inAndroidShort = appearsIn(keyword, shortDescription);
    result.inAndroidFull = appearsIn(keyword, fullDescription);
    result.inAndroid = result.inAndroidTitle || result.inAndroidShort || result.inAndroidFull;
    if (result.inAndroidTitle) result.placementAndroid = "title";
    else if (result.inAndroidShort) result.placementAndroid = "short_description";
    else if (result.inAndroidFull) result.placementAndroid = "full_description";
  }

  if (listingIos) {
    const { subtitle = "", keywords = "", description = "", promotionalText = "" } = listingIos;
    result.inIosSubtitle = appearsIn(keyword, subtitle);
    result.inIosKeywords = appearsIn(keyword, keywords);
    result.inIosDescription = appearsIn(keyword, description);
    result.inIosPromo = appearsIn(keyword, promotionalText);
    result.inIos = result.inIosSubtitle || result.inIosKeywords || result.inIosDescription || result.inIosPromo;
    if (result.inIosKeywords) result.placementIos = "keywords";
    else if (result.inIosSubtitle) result.placementIos = "subtitle";
    else if (result.inIosDescription) result.placementIos = "description";
    else if (result.inIosPromo) result.placementIos = "promotional_text";
  }

  result.inListing = result.inAndroid || result.inIos;
  return result;
}

/**
 * Score opportunity for Android only (title, short, full description).
 * @param {ReturnType<typeof analyzeKeywordPlacement>} placement
 * @param {number} [searchVolume]
 * @param {{ rankAndroid?: number | null }} [rankInfo] - app store SERP rank (1-based); null = not in top N
 * @returns {{ priority: "high" | "medium" | "low", note: string }}
 */
function scoreOpportunityAndroid(placement, searchVolume = 0, rankInfo = {}) {
  const rank = rankInfo.rankAndroid;
  const rankNote =
    typeof rank === "number"
      ? ` Rank #${rank} on Play.`
      : rank === null
        ? " Not in top 30 on Play."
        : "";

  if (!placement.inAndroid) {
    const volNote = searchVolume > 0 ? ` (vol: ${searchVolume})` : "";
    return { priority: "high", note: `Not in Play listing${volNote}. Add to title (30 chars) or short description (80 chars).${rankNote}` };
  }
  if (placement.inAndroidTitle || placement.inAndroidShort) {
    return { priority: "low", note: `In ${placement.placementAndroid}. Maintain or A/B test.${rankNote}` };
  }
  return { priority: "medium", note: `Only in full description. Move to title or short description for more impact.${rankNote}` };
}

/**
 * Score opportunity for iOS only (subtitle, keywords, description, promo).
 * @param {ReturnType<typeof analyzeKeywordPlacement>} placement
 * @param {number} [searchVolume]
 * @param {{ rankIos?: number | null }} [rankInfo] - app store SERP rank (1-based); null = not in top N
 * @returns {{ priority: "high" | "medium" | "low", note: string }}
 */
function scoreOpportunityIos(placement, searchVolume = 0, rankInfo = {}) {
  const rank = rankInfo.rankIos;
  const rankNote =
    typeof rank === "number"
      ? ` Rank #${rank} on App Store.`
      : rank === null
        ? " Not in top 100 on App Store."
        : "";

  if (!placement.inIos) {
    const volNote = searchVolume > 0 ? ` (vol: ${searchVolume})` : "";
    return { priority: "high", note: `Not in App Store listing${volNote}. Add to subtitle (30 chars) or keywords (100 chars).${rankNote}` };
  }
  if (placement.inIosKeywords || placement.inIosSubtitle) {
    return { priority: "low", note: `In ${placement.placementIos}. Maintain or A/B test.${rankNote}` };
  }
  return { priority: "medium", note: `Only in description/promo. Move to subtitle or keywords for more impact.${rankNote}` };
}

/**
 * Derive priority and suggestion note per store, plus overall priority for sorting.
 * When rankAndroid/rankIos are provided (from DataForSEO App Searches), notes include "Rank #N" or "Not in top N".
 * @param {ReturnType<typeof analyzeKeywordPlacement>} placement
 * @param {number} [searchVolume]
 * @param {{ hasAndroid?: boolean, hasIos?: boolean, rankAndroid?: number | null, rankIos?: number | null }} [options]
 * @returns {{ priority: "high" | "medium" | "low", priorityAndroid, noteAndroid, priorityIos, noteIos }}
 */
export function scoreOpportunity(placement, searchVolume = 0, options = {}) {
  const { hasAndroid = true, hasIos = true, rankAndroid, rankIos } = options;
  const order = { high: 0, medium: 1, low: 2 };
  const android = hasAndroid
    ? scoreOpportunityAndroid(placement, searchVolume, { rankAndroid })
    : { priority: "low", note: "No Android listing." };
  const ios = hasIos
    ? scoreOpportunityIos(placement, searchVolume, { rankIos })
    : { priority: "low", note: "No iOS listing." };

  // Boost to high if listing says medium but we're not in top 10 on that store (strong opportunity)
  let overallPriority = order[android.priority] <= order[ios.priority] ? android.priority : ios.priority;
  if (rankAndroid != null && rankAndroid > 10 && placement.inAndroid && android.priority === "medium") overallPriority = "high";
  if (rankIos != null && rankIos > 10 && placement.inIos && ios.priority === "medium") overallPriority = "high";

  return {
    priority: overallPriority,
    priorityAndroid: android.priority,
    noteAndroid: android.note,
    priorityIos: ios.priority,
    noteIos: ios.note,
  };
}
