/**
 * Generate ASO metadata drafts (title, subtitle, short description, keywords) from top opportunities using Claude.
 * Respects store limits: Android title 30, short 80; iOS subtitle 30, keywords 100 (comma-separated, no spaces).
 */
import Anthropic from "@anthropic-ai/sdk";
import { getLatestAsoSnapshots } from "@/lib/aso-firestore";
import { saveAsoSnapshot } from "@/lib/aso-firestore";
import { fetchGooglePlayListings } from "@/lib/google-play-listings";
import { fetchAppStoreListings } from "@/lib/appstore-connect-listings";

const MODEL = "claude-haiku-4-5";

const SYSTEM = `You are an ASO copywriter. Given top opportunity keywords and the app's current store listing, produce ONE set of metadata drafts that work for both Google Play and App Store.

Strict limits (do not exceed):
- Android title: 30 characters max
- Android short description: 80 characters max
- iOS subtitle: 30 characters max
- iOS keywords: 100 characters max, comma-separated, no spaces after commas (e.g. "word1,word2,word3")

Weave in the opportunity keywords naturally. Keep copy clear and user-focused. Return ONLY valid JSON in this exact shape, no markdown:
{"android":{"title":"...","shortDescription":"..."},"ios":{"subtitle":"...","keywords":"..."}}`;

function parseDraftsFromContent(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim().replace(/```json?\s*|\s*```/g, "").trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const d = JSON.parse(match[0]);
    if (d?.android && d?.ios) return d;
  } catch (_) {}
  return null;
}

/**
 * @param {Array<{ keyword: string, opportunity?: boolean }>} opportunities - top opportunities (e.g. top 10)
 * @param {string} currentListingText - current Android + iOS listing summary for context
 * @returns {Promise<{ ok: boolean, drafts?: { android: { title: string, shortDescription: string }, ios: { subtitle: string, keywords: string } }, error?: string }>}
 */
export async function generateMetadataDrafts(opportunities, currentListingText) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY not set" };

  const top = (opportunities || []).filter((o) => o.opportunity !== false).slice(0, 10);
  const keywords = top.map((o) => o.keyword).join(", ");
  if (!keywords) return { ok: false, error: "No opportunity keywords provided" };

  const user = `Current store listing (for context):\n${(currentListingText || "No listing.").slice(0, 1500)}\n\nTop opportunity keywords to incorporate: ${keywords}\n\nReturn one JSON object with android.title, android.shortDescription, ios.subtitle, ios.keywords. Respect character limits.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    const text = msg.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const drafts = parseDraftsFromContent(text);
    if (!drafts) return { ok: false, error: "Claude did not return valid drafts JSON" };

    const android = drafts.android || {};
    const ios = drafts.ios || {};
    const out = {
      android: {
        title: (android.title || "").slice(0, 30),
        shortDescription: (android.shortDescription || "").slice(0, 80),
      },
      ios: {
        subtitle: (ios.subtitle || "").slice(0, 30),
        keywords: (ios.keywords || "").replace(/\s+/g, "").slice(0, 100),
      },
    };

    return { ok: true, drafts: out };
  } catch (e) {
    return { ok: false, error: e.message || "Failed to generate drafts" };
  }
}

/**
 * Load latest opportunities and listing, generate drafts, save to Firestore.
 * @returns {Promise<{ ok: boolean, drafts?: object, error?: string }>}
 */
export async function runMetadataDraftsPipeline() {
  const [opportunityMapping] = await getLatestAsoSnapshots("opportunity_mapping", 1);
  const opportunities = opportunityMapping?.opportunities || [];
  if (opportunities.length === 0) {
    return { ok: false, error: "No opportunities found. Run the ASO pipeline first." };
  }

  let currentListingText = "";
  const androidPkg = process.env.ANDROID_PACKAGE_NAME?.trim();
  const iosAppId = process.env.APPSTORE_APP_ID?.trim();
  const iosBundleId = process.env.APPSTORE_BUNDLE_ID?.trim();
  if (androidPkg) {
    try {
      const r = await fetchGooglePlayListings(androidPkg);
      if (r.ok && r.data?.listings?.length) {
        const en = r.data.listings.find((l) => l.language === "en-US" || l.language === "en") || r.data.listings[0];
        currentListingText += `Android: title="${en.title}", short="${(en.shortDescription || "").slice(0, 150)}". `;
      }
    } catch (_) {}
  }
  if (iosAppId || iosBundleId) {
    try {
      const r = await fetchAppStoreListings(iosAppId, iosBundleId);
      if (r.ok && r.data?.localizations?.length) {
        const en = r.data.localizations.find((l) => l.locale === "en-US" || l.locale === "en") || r.data.localizations[0];
        currentListingText += `iOS: subtitle="${en.subtitle}", keywords="${(en.keywords || "").slice(0, 100)}", description="${(en.description || "").slice(0, 200)}".`;
      }
    } catch (_) {}
  }

  const result = await generateMetadataDrafts(opportunities, currentListingText);
  if (!result.ok) return result;

  await saveAsoSnapshot("metadata_drafts", {
    ...result.drafts,
    opportunityCount: opportunities.filter((o) => o.opportunity).length,
    run_at: new Date().toISOString(),
  }).catch(() => {});

  return result;
}
