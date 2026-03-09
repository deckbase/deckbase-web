/**
 * ASO pipeline runner. Used by POST /api/aso/pipeline and /api/aso/pipeline/stream.
 * Fetches current store listing (Google Play + App Store) as baseline, then keyword discovery, Claude filter, opportunity scoring.
 */
import { researchQuery } from "@/lib/perplexity";
import { fetchKeywordSuggestions } from "@/lib/dataforseo";
import { fetchAppSearchRankings } from "@/lib/dataforseo-app";
import { saveAsoSnapshot } from "@/lib/aso-firestore";
import { fetchGooglePlayListings } from "@/lib/google-play-listings";
import { fetchAppStoreListings } from "@/lib/appstore-connect-listings";
import { analyzeKeywordPlacement, scoreOpportunity } from "@/lib/aso-listing-analysis";
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_KEYWORDS = [
  "flashcard app",
  "AI flashcards",
  "spaced repetition",
  "study app",
  "memory cards",
];

/**
 * Derive initial keywords from store listing (iOS keywords field, Android title/short description).
 * Used when no seed keywords are provided so the pipeline can run from listing data alone.
 */
function deriveKeywordsFromListing(listingAndroid, listingIos) {
  const out = new Set();
  if (listingIos?.keywords) {
    const iosKeywords = listingIos.keywords
      .split(/[,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length >= 2 && k.length <= 80);
    iosKeywords.forEach((k) => out.add(k));
  }
  if (listingIos?.subtitle) {
    const s = listingIos.subtitle.trim();
    if (s.length >= 2 && s.length <= 80) out.add(s);
  }
  if (listingAndroid?.title) {
    const t = listingAndroid.title.trim();
    if (t.length >= 2 && t.length <= 80) out.add(t);
  }
  if (listingAndroid?.shortDescription) {
    listingAndroid.shortDescription
      .split(/[,.;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 3 && p.length <= 80)
      .slice(0, 5)
      .forEach((p) => out.add(p));
  }
  return [...out];
}

const PERPLEXITY_ASO_PROMPT = `You are an ASO researcher. For a mobile flashcard and spaced repetition app (Deckbase) on the Apple App Store and Google Play, list 5–10 search phrases users type when looking for apps like this. Include:
- App store search terms (e.g. "best flashcard app", "anki alternative", "spaced repetition app")
- Use cases (e.g. "flashcards for medical students", "language learning flashcards")
- Comparisons (e.g. "quizlet vs anki", "flashcard app with AI")

Return ONLY a JSON array of strings, one keyword per element. No markdown, no explanation. Example: ["best flashcard app 2024", "spaced repetition app for students"]`;

function parseKeywordListFromContent(content) {
  if (!content || typeof content !== "string") return [];
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
    } catch (_) {}
  }
  const lines = trimmed
    .split(/\n/)
    .map((l) => l.replace(/^[-*]\s*|\d+\.\s*|^"\s*|"\s*$/g, "").trim())
    .filter((s) => s.length > 2 && s.length < 80);
  return lines.slice(0, 20);
}

/**
 * Filter keywords with Claude Haiku: remove irrelevant brands and generic low-intent, cap at 200.
 * If currentListingText is provided, instructs Claude to prefer keywords NOT already reflected in the listing.
 */
async function filterKeywordsWithClaude(keywords, currentListingText, onProgress) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || !keywords.length) return { ok: false, filtered: keywords, error: apiKey ? "No keywords" : "ANTHROPIC_API_KEY not set" };

  const list = keywords.slice(0, 500).join("\n");
  const system = `You are an ASO keyword filter. Given a list of app-store search keywords, return a filtered list that:
- Keeps high-intent terms (user looking for an app, a feature, or a use case).
- Removes irrelevant competitor brand names (unless we are comparing to them, e.g. "alternative to X" is OK).
- Removes overly generic single words (e.g. "app", "free") unless part of a phrase.
- Removes duplicates and near-duplicates.
- Maximum 200 keywords. Prefer phrases over single words.`;
  const listingContext = currentListingText
    ? `\n\nThe app's CURRENT store listing (use as baseline — prefer keywords that are NOT already clearly reflected here):\n${currentListingText}`
    : "";
  const user = `Filter these keywords and return a JSON array of at most 200 strings.${listingContext}\n\nKeywords:\n${list}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = msg.content?.find((c) => c.type === "text")?.text?.trim() ?? "[]";
    const jsonStr = text.replace(/```json?\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    const filtered = Array.isArray(parsed)
      ? parsed.map((x) => String(x).trim()).filter(Boolean).slice(0, 200)
      : keywords.slice(0, 200);
    return { ok: true, filtered };
  } catch (e) {
    return { ok: false, filtered: keywords.slice(0, 200), error: e.message };
  }
}

/**
 * @param {Object} body - keywords, use_perplexity_seeds, use_dataforseo_suggestions, use_claude_filter, location_code, language_code
 * @param {(step: string, status: string, message: string) => void} [onProgress]
 */
export async function runAsoPipeline(body, onProgress) {
  const out = { store_listings: null, overview: null, perplexity: null, dataforseo_suggestions: null, claude_filter: null, app_rankings: null, opportunity_scoring: null };
  const emit = (step, status, message) => onProgress?.(step, status, message);

  // Step: Fetch current store listing (baseline for analysis)
  let currentListingText = "";
  let listingAndroid = null;
  let listingIos = null;
  emit("store_listings", "running", "Fetching current store listing (Google Play & App Store)…");
  try {
    const androidPkg = body.android_package_name || process.env.ANDROID_PACKAGE_NAME || "";
    const iosAppId = body.app_id_ios || process.env.APPSTORE_APP_ID || "";
    const iosBundleId = body.bundle_id_ios || process.env.APPSTORE_BUNDLE_ID || "";
    const androidRes = androidPkg
      ? await fetchGooglePlayListings(androidPkg)
      : { ok: false, error: "No Android package" };
    const iosRes =
      iosAppId || iosBundleId
        ? await fetchAppStoreListings(iosAppId, iosBundleId)
        : { ok: false, error: "No iOS app/bundle id" };
    const parts = [];
    if (androidRes.ok && androidRes.data?.listings?.length) {
      const en = androidRes.data.listings.find((l) => l.language === "en-US" || l.language === "en") || androidRes.data.listings[0];
      parts.push(`Android (${en.language}): title="${en.title}", short="${(en.shortDescription || "").slice(0, 200)}", full="${(en.fullDescription || "").slice(0, 500)}..."`);
      listingAndroid = {
        title: en.title || "",
        shortDescription: en.shortDescription || "",
        fullDescription: en.fullDescription || "",
      };
    } else if (androidPkg) parts.push(`Android: ${androidRes.error || "no data"}`);
    if (iosRes.ok && iosRes.data?.localizations?.length) {
      const en = iosRes.data.localizations.find((l) => l.locale === "en-US" || l.locale === "en") || iosRes.data.localizations[0];
      parts.push(`iOS (${en.locale}): subtitle="${en.subtitle}", keywords="${(en.keywords || "").slice(0, 150)}", description="${(en.description || "").slice(0, 300)}..."`);
      listingIos = {
        appName: iosRes.data.appName || "",
        subtitle: en.subtitle || "",
        keywords: en.keywords || "",
        description: en.description || "",
        promotionalText: en.promotionalText || "",
      };
    } else if (iosAppId || iosBundleId) parts.push(`iOS: ${iosRes.error || "no data"}`);
    currentListingText = parts.length ? parts.join("\n") : "No store listing data (set ANDROID_PACKAGE_NAME and/or APPSTORE_APP_ID / APPSTORE_BUNDLE_ID).";
    out.store_listings = {
      ok: androidRes.ok || iosRes.ok,
      android: androidRes.ok ? { packageName: androidRes.data.packageName, listingCount: androidRes.data.listings?.length } : { error: androidRes.error },
      ios: iosRes.ok ? { appId: iosRes.data.appId, localizationCount: iosRes.data.localizations?.length } : { error: iosRes.error },
      summary: currentListingText.slice(0, 500),
    };
    emit("store_listings", "done", out.store_listings.ok ? "Current listing loaded" : "No store data (configure env)");
  } catch (e) {
    out.store_listings = { ok: false, error: e.message };
    emit("store_listings", "done", e.message);
  }

  let keywords = Array.isArray(body.keywords)
    ? body.keywords
    : (body.keywords || "")
        .toString()
        .split(/[\n,]+/)
        .map((k) => k.trim())
        .filter(Boolean);

  if (keywords.length === 0 && (listingAndroid || listingIos)) {
    keywords = deriveKeywordsFromListing(listingAndroid, listingIos);
  }
  if (keywords.length === 0) {
    keywords = DEFAULT_KEYWORDS;
  }

  // Step: Perplexity seed discovery
  const usePerplexity = body.use_perplexity_seeds === true || (body.perplexity_query && String(body.perplexity_query).trim());
  if (usePerplexity) {
    emit("perplexity", "running", "Asking Perplexity for app store keyword ideas…");
    try {
      const query = (body.perplexity_query || PERPLEXITY_ASO_PROMPT).toString().trim();
      const res = await researchQuery(query, { maxTokens: 1024 });
      if (res.ok && res.content) {
        const discovered = parseKeywordListFromContent(res.content);
        if (discovered.length) {
          const merged = [...new Map([...discovered.map((k) => [k.toLowerCase(), k]), ...keywords.map((k) => [k.toLowerCase(), k])]).values()];
          keywords = merged.slice(0, 25);
          out.perplexity = { ok: true, discovered: discovered.length, keywords: discovered };
          emit("perplexity", "done", `Discovered ${discovered.length} keywords`);
        } else {
          out.perplexity = { ok: true, discovered: 0, message: "No keywords parsed" };
          emit("perplexity", "done", "No keywords parsed");
        }
      } else {
        out.perplexity = { ok: false, error: res.error || "Perplexity request failed" };
        emit("perplexity", "done", out.perplexity.error);
      }
    } catch (e) {
      out.perplexity = { ok: false, error: e.message };
      emit("perplexity", "done", e.message);
    }
  } else {
    emit("perplexity", "skip", "Skipped");
  }

  // Step: DataForSEO keyword suggestions
  const useDataForSeo = body.use_dataforseo_suggestions !== false;
  const keywordToVolume = new Map();
  if (useDataForSeo && keywords.length > 0) {
    emit("dataforseo_suggestions", "running", "Expanding with DataForSEO keyword suggestions…");
    const seeds = keywords.slice(0, 5);
    const suggestedByKey = new Map();
    for (const seed of seeds) {
      try {
        const res = await fetchKeywordSuggestions({
          keyword: seed,
          locationCode: body.location_code ?? 2840,
          languageCode: body.language_code ?? "en",
          limit: 50,
        });
        if (res.ok && res.data?.items?.length) {
          for (const item of res.data.items) {
            const k = (item.keyword || "").trim();
            if (!k) continue;
            const key = k.toLowerCase();
            const vol = item.search_volume ?? 0;
            const existing = suggestedByKey.get(key);
            if (!existing || (existing.search_volume ?? 0) < vol) suggestedByKey.set(key, { keyword: k, search_volume: vol });
          }
        }
      } catch (_) {}
    }
    if (suggestedByKey.size > 0) {
      for (const [key, val] of suggestedByKey) keywordToVolume.set(key, val.search_volume ?? 0);
      const suggestedList = [...suggestedByKey.values()]
        .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
        .map((x) => x.keyword)
        .slice(0, 100);
      const merged = [...new Map([...keywords.map((k) => [k.toLowerCase(), k]), ...suggestedList.map((k) => [k.toLowerCase(), k])]).values()];
      keywords = merged.slice(0, 300);
      out.dataforseo_suggestions = { ok: true, added: suggestedByKey.size, totalKeywords: keywords.length };
      emit("dataforseo_suggestions", "done", `Added ${suggestedByKey.size} suggestions, ${keywords.length} total`);
    } else {
      out.dataforseo_suggestions = { ok: true, added: 0 };
      emit("dataforseo_suggestions", "done", "No new suggestions");
    }
  } else {
    out.dataforseo_suggestions = { skip: true };
    emit("dataforseo_suggestions", "skip", "Skipped");
  }

  // Step: Overview (stub until more store/review data)
  emit("overview", "running", "Overview (store data)…");
  out.overview = { ok: true, message: currentListingText ? "Store listing used as baseline for filtering." : "Connect Google Play & App Store for listing baseline (Phase 2)." };
  emit("overview", "done", currentListingText ? "Listing baseline set" : "Skipped (no store connection yet)");

  const list = keywords.length ? keywords : DEFAULT_KEYWORDS;

  // Step: Claude filter (<200 terms), using current listing as context
  const useClaudeFilter = body.use_claude_filter !== false && list.length > 0;
  let filteredList = list;
  if (useClaudeFilter) {
    emit("claude_filter", "running", "Filtering keywords with Claude (based on current listing)…");
    const result = await filterKeywordsWithClaude(list, currentListingText, onProgress);
    filteredList = result.filtered;
    if (result.ok) {
      out.claude_filter = { ok: true, before: list.length, after: filteredList.length };
      emit("claude_filter", "done", `Filtered to ${filteredList.length} keywords`);
    } else {
      out.claude_filter = { ok: false, error: result.error, before: list.length, after: filteredList.length };
      emit("claude_filter", "done", result.error || "Using unfiltered list");
    }
  } else {
    out.claude_filter = { skip: true };
    emit("claude_filter", "skip", "Skipped");
  }

  // Step: DataForSEO App Data — App Searches (app store SERP per keyword → our rank)
  const useAppRankings =
    body.use_app_rankings === true &&
    (body.android_package_name || process.env.ANDROID_PACKAGE_NAME || body.app_id_ios || process.env.APPSTORE_APP_ID);
  let rankAndroidByKeyword = {};
  let rankIosByKeyword = {};
  if (useAppRankings && filteredList.length > 0) {
    emit("app_rankings", "running", "Fetching app store rankings (DataForSEO App Searches)…");
    const androidPkg = body.android_package_name || process.env.ANDROID_PACKAGE_NAME || "";
    const iosAppId = body.app_id_ios || process.env.APPSTORE_APP_ID || "";
    try {
      const rankRes = await fetchAppSearchRankings({
        keywords: filteredList.slice(0, 25),
        appIdApple: iosAppId.trim() || undefined,
        packageNameAndroid: androidPkg.trim() || undefined,
        locationCode: body.location_code ?? 2840,
        languageCode: body.language_code ?? "en",
        maxKeywords: 25,
      });
      if (rankRes.ok) {
        rankAndroidByKeyword = rankRes.android || {};
        rankIosByKeyword = rankRes.ios || {};
        const aCount = Object.keys(rankAndroidByKeyword).length;
        const iCount = Object.keys(rankIosByKeyword).length;
        out.app_rankings = { ok: true, keywordsChecked: Math.max(aCount, iCount) || filteredList.slice(0, 25).length };
        emit("app_rankings", "done", `Rankings for ${Math.max(aCount, iCount) || 0} keywords`);
      } else {
        out.app_rankings = { ok: false, error: rankRes.error };
        emit("app_rankings", "done", rankRes.error || "App rankings failed");
      }
    } catch (e) {
      out.app_rankings = { ok: false, error: e.message };
      emit("app_rankings", "done", e.message);
    }
  } else {
    out.app_rankings = { skip: true };
    emit("app_rankings", "skip", "Skipped (enable use_app_rankings and set app ids)");
  }

  // Step: Opportunity scoring (listing-based + optional rank: placement + rank → priority + note)
  emit("opportunity_scoring", "running", "Scoring opportunities (vs current listing and rankings)…");
  const opportunities = filteredList.map((keyword) => {
    const placement = analyzeKeywordPlacement(keyword, listingAndroid, listingIos);
    const searchVolume = keywordToVolume.get(keyword.toLowerCase()) ?? 0;
    const rankAndroid = rankAndroidByKeyword[keyword] !== undefined ? rankAndroidByKeyword[keyword] : undefined;
    const rankIos = rankIosByKeyword[keyword] !== undefined ? rankIosByKeyword[keyword] : undefined;
    const { priority, priorityAndroid, noteAndroid, priorityIos, noteIos } = scoreOpportunity(
      placement,
      searchVolume,
      { hasAndroid: !!listingAndroid, hasIos: !!listingIos, rankAndroid, rankIos }
    );
    return {
      keyword,
      opportunity: priority !== "low" || !placement.inListing,
      inListing: placement.inListing,
      placementAndroid: placement.placementAndroid,
      placementIos: placement.placementIos,
      priority,
      priorityAndroid,
      noteAndroid,
      priorityIos,
      noteIos,
      note: [noteAndroid, noteIos].filter(Boolean).join(" · "),
      search_volume: searchVolume || undefined,
      ...(rankAndroid !== undefined && { rank_android: rankAndroid }),
      ...(rankIos !== undefined && { rank_ios: rankIos }),
    };
  });
  // Sort: high first, then by search_volume desc, then medium, then low
  opportunities.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    const pa = order[a.priority] ?? 2;
    const pb = order[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return (b.search_volume ?? 0) - (a.search_volume ?? 0);
  });
  const opportunityCount = opportunities.filter((o) => o.opportunity).length;
  out.opportunity_scoring = {
    ok: true,
    count: opportunities.length,
    opportunityCount,
    message: listingAndroid || listingIos
      ? `Listing-based analysis: ${opportunityCount} opportunities (high/medium priority).`
      : "No store listing data; run again after connecting Google Play and/or App Store.",
  };
  emit("opportunity_scoring", "done", `${opportunityCount} opportunities (${opportunities.length} keywords analyzed)`);

  // Persist
  await saveAsoSnapshot("keyword_shortlist", {
    keywords: filteredList,
    count: filteredList.length,
    run_at: new Date().toISOString(),
  }).catch(() => {});

  await saveAsoSnapshot("opportunity_mapping", {
    opportunities,
    opportunityCount,
    run_at: new Date().toISOString(),
  }).catch(() => {});

  const analysis = {
    totalKeywords: filteredList.length,
    opportunityCount,
    topOpportunities: opportunities.filter((o) => o.opportunity).slice(0, 15),
    opportunities,
  };

  return {
    ok: true,
    steps: out,
    analysis,
    message: currentListingText
      ? "ASO pipeline completed using current store listing as baseline. Keyword shortlist and opportunities saved."
      : "ASO pipeline completed. Connect store APIs (ANDROID_PACKAGE_NAME, APPSTORE_*) for listing-based analysis.",
  };
}
