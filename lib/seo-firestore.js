/**
 * Server-only Firestore persistence for SEO Command Center results.
 * Saves search volume and rankings snapshots for consistency and history.
 */
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/utils/firebase-admin";

const COLLECTION = "seo_snapshots";

function getDb() {
  return getAdminFirestore();
}

/**
 * Save an SEO result snapshot.
 * @param {"search_volume" | "rankings" | "serp_opportunity_mapping"} type
 * @param {Object} payload - { keywords, result, domain? } or for serp_opportunity_mapping: { domain, opportunities, opportunityCount, auditSummary?, run_at? }
 * @param {string} [createdBy] - Optional user uid
 * @returns {Promise<{ id: string } | null>} Doc id or null if Firestore not configured
 */
export async function saveSeoSnapshot(type, payload, createdBy = null) {
  const db = getDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc();
  const base = {
    type,
    created_at: Timestamp.now(),
    ...(createdBy && { created_by: createdBy }),
  };
  const data =
    type === "serp_opportunity_mapping"
      ? {
          ...base,
          domain: payload.domain ?? null,
          opportunities: payload.opportunities ?? [],
          opportunityCount: payload.opportunityCount ?? 0,
          auditSummary: payload.auditSummary ?? null,
          run_at: payload.run_at ?? null,
        }
      : {
          ...base,
          keywords: payload.keywords || [],
          result: payload.result || null,
          ...(payload.domain != null && { domain: payload.domain }),
        };
  await ref.set(data);
  return { id: ref.id };
}

/**
 * Get the latest snapshot(s) by type.
 * @param {"search_volume" | "rankings" | "serp_opportunity_mapping"} [type]
 * @param {number} [limit=1]
 * @returns {Promise<Array<{ id, type, ... }>>}
 */
export async function getLatestSeoSnapshots(type = null, limit = 1) {
  const db = getDb();
  if (!db) return [];

  const col = db.collection(COLLECTION);
  const snap = await col.orderBy("created_at", "desc").limit(50).get();

  const byType = { search_volume: [], rankings: [], serp_opportunity_mapping: [] };
  snap.docs.forEach((d) => {
    const x = d.data();
    const item = {
      id: d.id,
      type: x.type,
      created_at: x.created_at?.toMillis?.() ?? null,
      ...(x.type === "serp_opportunity_mapping"
        ? { domain: x.domain, opportunities: x.opportunities || [], opportunityCount: x.opportunityCount ?? 0, auditSummary: x.auditSummary }
        : { keywords: x.keywords || [], result: x.result, domain: x.domain ?? null }),
    };
    if (byType[x.type]?.length < limit) byType[x.type].push(item);
  });

  if (type) return byType[type] || [];
  return [
    ...(byType.search_volume[0] ? [byType.search_volume[0]] : []),
    ...(byType.rankings[0] ? [byType.rankings[0]] : []),
    ...(byType.serp_opportunity_mapping[0] ? [byType.serp_opportunity_mapping[0]] : []),
  ];
}

const MAPPING_DOC_ID = "default";

/**
 * Get keyword → URL mapping for Step 4 → Step 5 hand-off (audit existing page vs trigger pSEO).
 * @returns {Promise<Record<string, string>>} { "keyword": "https://..." }
 */
export async function getKeywordUrlMapping() {
  const db = getDb();
  if (!db) return {};
  const doc = await db.collection("seo_keyword_url_mapping").doc(MAPPING_DOC_ID).get();
  const data = doc.exists ? doc.data() : {};
  return data.mappings && typeof data.mappings === "object" ? data.mappings : {};
}

/**
 * Set keyword → URL mapping (merge with existing).
 * @param {Record<string, string>} mappings - { "keyword": "https://..." }
 * @returns {Promise<void>}
 */
export async function setKeywordUrlMapping(mappings) {
  const db = getDb();
  if (!db || !mappings || typeof mappings !== "object") return;
  const ref = db.collection("seo_keyword_url_mapping").doc(MAPPING_DOC_ID);
  await ref.set(
    { mappings: { ...mappings }, updated_at: Timestamp.now() },
    { merge: true }
  );
}
