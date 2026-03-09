/**
 * Server-only Firestore persistence for ASO Command Center.
 * Pipeline runs, keyword shortlists, and opportunity mapping.
 */
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/utils/firebase-admin";

const COLLECTION = "aso_snapshots";

function getDb() {
  return getAdminFirestore();
}

/**
 * Save an ASO snapshot.
 * @param {"aso_pipeline_run" | "keyword_shortlist" | "opportunity_mapping" | "metadata_drafts"} type
 * @param {Object} payload
 * @param {string} [createdBy]
 * @returns {Promise<{ id: string } | null>}
 */
export async function saveAsoSnapshot(type, payload, createdBy = null) {
  const db = getDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc();
  const base = {
    type,
    created_at: Timestamp.now(),
    ...(createdBy && { created_by: createdBy }),
  };
  await ref.set({ ...base, ...payload });
  return { id: ref.id };
}

/**
 * Get latest ASO snapshot(s) by type.
 * @param {string} [type]
 * @param {number} [limit=1]
 * @returns {Promise<Array<{ id, type, created_at, ... }>>}
 */
export async function getLatestAsoSnapshots(type = null, limit = 1) {
  const db = getDb();
  if (!db) return [];

  const scanLimit = limit > 1 ? Math.min(300, limit * 6) : 50;
  const snap = await db.collection(COLLECTION).orderBy("created_at", "desc").limit(scanLimit).get();
  const byType = { aso_pipeline_run: [], keyword_shortlist: [], opportunity_mapping: [], metadata_drafts: [] };
  snap.docs.forEach((d) => {
    const x = d.data();
    const created_at = x.created_at?.toMillis?.() ?? null;
    const { created_at: _ts, ...rest } = x;
    const item = { id: d.id, type: x.type, created_at, ...rest };
    if (byType[x.type] && byType[x.type].length < limit) byType[x.type].push(item);
  });
  if (type) return byType[type] || [];
  return [
    ...(byType.aso_pipeline_run[0] ? [byType.aso_pipeline_run[0]] : []),
    ...(byType.keyword_shortlist[0] ? [byType.keyword_shortlist[0]] : []),
    ...(byType.opportunity_mapping[0] ? [byType.opportunity_mapping[0]] : []),
    ...(byType.metadata_drafts[0] ? [byType.metadata_drafts[0]] : []),
  ];
}
