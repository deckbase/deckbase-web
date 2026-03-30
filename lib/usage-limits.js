/**
 * Server-only usage tracking and plan limits.
 * Stores monthly usage in Firestore: users/{uid}/usage/{monthKey}
 * monthKey = "YYYY-MM". Limits from PRICING.md: Free = 0, Basic = 250 AI / 30K TTS / 2GB, Pro = 600 AI / 50K TTS / 20GB.
 * MCP: `mcpRequests` counts hosted JSON-RPC calls (POST /api/mcp) per month; limits not enforced yet.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, getAdminBucket, isAdminConfigured } from "@/utils/firebase-admin";
import { getSubscriptionTier, isBasicOrProOrVip } from "@/lib/revenuecat-server";
import { CREDIT_COST_BY_MODEL } from "@/lib/fal-credit-costs";

export { CREDIT_COST_BY_MODEL };

const USAGE_COLLECTION = "usage";
const STORAGE_CACHE_DOC = "storage";
const STORAGE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

const AI_GENERATIONS_LIMIT_BASIC = 250;
const AI_GENERATIONS_LIMIT_PRO = 600;
const TTS_CHARS_LIMIT_BASIC = 30000;
const TTS_CHARS_LIMIT_PRO = 50000;
const STORAGE_BYTES_LIMIT_BASIC = 2 * 1024 * 1024 * 1024; // 2GB
const STORAGE_BYTES_LIMIT_PRO = 20 * 1024 * 1024 * 1024; // 20GB

/** Monthly AI image credit pool (weighted by model). See docs/features/AI_IMAGE_FAL_FEASIBILITY.md */
const IMAGE_CREDIT_LIMIT_BASIC = 40;
const IMAGE_CREDIT_LIMIT_PRO = 100;

/** Firestore map keys cannot use `/` in dot paths; encode model ids for `imageGenerationsByModel`. */
function modelIdToUsageMapKey(modelId) {
  return String(modelId).replace(/\//g, "__");
}

function getMonthKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getDb() {
  return getAdminFirestore();
}

/**
 * Get usage doc for current month. Creates with zeros if missing.
 * @returns {{
 *   aiGenerations: number,
 *   ttsChars: number,
 *   mcpRequests: number,
 *   imageCreditsUsed: number,
 *   imageGenerations: number,
 *   imageGenerationsByModel: Record<string, number>,
 * } | null}
 */
export async function getMonthlyUsage(uid) {
  if (!uid || !isAdminConfigured()) return null;
  const db = getDb();
  if (!db) return null;
  const ref = db.collection("users").doc(uid).collection(USAGE_COLLECTION).doc(getMonthKey());
  const snap = await ref.get();
  if (!snap.exists) {
    return {
      aiGenerations: 0,
      ttsChars: 0,
      mcpRequests: 0,
      imageCreditsUsed: 0,
      imageGenerations: 0,
      imageGenerationsByModel: {},
    };
  }
  const d = snap.data();
  const rawMap = d.imageGenerationsByModel && typeof d.imageGenerationsByModel === "object"
    ? d.imageGenerationsByModel
    : {};
  /** @type {Record<string, number>} */
  const imageGenerationsByModel = {};
  for (const [k, v] of Object.entries(rawMap)) {
    imageGenerationsByModel[k] = Math.max(0, Number(v) || 0);
  }
  return {
    aiGenerations: Math.max(0, Number(d.aiGenerations) || 0),
    ttsChars: Math.max(0, Number(d.ttsChars) || 0),
    mcpRequests: Math.max(0, Number(d.mcpRequests) || 0),
    imageCreditsUsed: Math.max(0, Number(d.imageCreditsUsed) || 0),
    imageGenerations: Math.max(0, Number(d.imageGenerations) || 0),
    imageGenerationsByModel,
  };
}

/**
 * Increment AI generations for the current month. Call after successful generation.
 * @param {string} uid
 * @param {number} count
 */
export async function incrementAIGenerations(uid, count) {
  if (!uid || count <= 0 || !isAdminConfigured()) return;
  const db = getDb();
  if (!db) return;
  const monthKey = getMonthKey();
  const ref = db.collection("users").doc(uid).collection(USAGE_COLLECTION).doc(monthKey);
  await ref.set(
    {
      aiGenerations: FieldValue.increment(count),
      monthKey,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Increment TTS character count for the current month. Call after successful TTS.
 * @param {string} uid
 * @param {number} chars
 */
export async function incrementTTSChars(uid, chars) {
  if (!uid || chars <= 0 || !isAdminConfigured()) return;
  const db = getDb();
  if (!db) return;
  const monthKey = getMonthKey();
  const ref = db.collection("users").doc(uid).collection(USAGE_COLLECTION).doc(monthKey);
  await ref.set(
    {
      ttsChars: FieldValue.increment(chars),
      monthKey,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Increment hosted MCP JSON-RPC request count for the current month. Call after each POST /api/mcp handled.
 * @param {string} uid
 * @param {number} [count=1]
 */
export async function incrementMcpRequests(uid, count = 1) {
  if (!uid || count <= 0 || !isAdminConfigured()) return;
  const db = getDb();
  if (!db) return;
  const monthKey = getMonthKey();
  const ref = db.collection("users").doc(uid).collection(USAGE_COLLECTION).doc(monthKey);
  await ref.set(
    {
      mcpRequests: FieldValue.increment(count),
      monthKey,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Check if user can use AI generation (Basic/Pro and under limit). Free = not allowed.
 * @returns {{ allowed: boolean, limit: number, used: number, message?: string }}
 */
export async function checkAIGenerationLimit(uid) {
  if (!uid) {
    return { allowed: false, limit: 0, used: 0, message: "Authentication required" };
  }
  const tier = await getSubscriptionTier(uid);
  if (tier === "free") {
    return {
      allowed: false,
      limit: 0,
      used: 0,
      message: "Active subscription required to use AI features",
    };
  }
  const limit = tier === "pro" ? AI_GENERATIONS_LIMIT_PRO : AI_GENERATIONS_LIMIT_BASIC;
  const usage = await getMonthlyUsage(uid);
  const used = usage?.aiGenerations ?? 0;
  if (used >= limit) {
    return {
      allowed: false,
      limit,
      used,
      message: `Monthly AI generation limit reached (${limit}/month). Resets next month.`,
    };
  }
  return { allowed: true, limit, used };
}

/**
 * Check if user can use TTS (Basic/Pro and under char limit). Free = not allowed.
 * @param {string} uid
 * @param {number} [additionalChars=0]
 * @returns {{ allowed: boolean, limit: number, used: number, message?: string }}
 */
/**
 * Check if user can run an image generation (Basic/Pro and enough monthly credits).
 * @param {string} uid
 * @param {string} resolvedModelId - fal endpoint id (must exist in CREDIT_COST_BY_MODEL)
 * @returns {{ allowed: boolean, limit: number, used: number, cost: number, message?: string }}
 */
export async function checkImageGenerationLimit(uid, resolvedModelId) {
  if (!uid) {
    return { allowed: false, limit: 0, used: 0, cost: 0, message: "Authentication required" };
  }
  const cost = CREDIT_COST_BY_MODEL[resolvedModelId];
  if (cost == null || cost <= 0) {
    return {
      allowed: false,
      limit: 0,
      used: 0,
      cost: 0,
      message: "Unknown or unsupported image model",
    };
  }
  const tier = await getSubscriptionTier(uid);
  if (tier === "free") {
    return {
      allowed: false,
      limit: 0,
      used: 0,
      cost,
      message: "Active subscription required for AI image generation",
    };
  }
  const limit = tier === "pro" ? IMAGE_CREDIT_LIMIT_PRO : IMAGE_CREDIT_LIMIT_BASIC;
  const usage = await getMonthlyUsage(uid);
  const used = usage?.imageCreditsUsed ?? 0;
  if (used + cost > limit) {
    return {
      allowed: false,
      limit,
      used,
      cost,
      message: `Monthly AI image credits exhausted (${used}/${limit} used; this model needs ${cost} credits). Resets next month.`,
    };
  }
  return { allowed: true, limit, used, cost };
}

/**
 * Increment image credits and per-model counts after a successful fal image call.
 * @param {string} uid
 * @param {string} resolvedModelId
 */
export async function incrementImageUsage(uid, resolvedModelId) {
  if (!uid || !isAdminConfigured()) return;
  const cost = CREDIT_COST_BY_MODEL[resolvedModelId];
  if (cost == null || cost <= 0) return;
  const db = getDb();
  if (!db) return;
  const monthKey = getMonthKey();
  const ref = db.collection("users").doc(uid).collection(USAGE_COLLECTION).doc(monthKey);
  const mapKey = modelIdToUsageMapKey(resolvedModelId);
  const payload = {
    imageCreditsUsed: FieldValue.increment(cost),
    imageGenerations: FieldValue.increment(1),
    [`imageGenerationsByModel.${mapKey}`]: FieldValue.increment(1),
    monthKey,
    updatedAt: new Date().toISOString(),
  };
  await ref.set(payload, { merge: true });
}

export async function checkTTSLimit(uid, additionalChars = 0) {
  if (!uid) {
    return { allowed: false, limit: 0, used: 0, message: "Authentication required" };
  }
  const tier = await getSubscriptionTier(uid);
  if (tier === "free") {
    return {
      allowed: false,
      limit: 0,
      used: 0,
      message: "Pro subscription required for text-to-speech",
    };
  }
  const limit = tier === "pro" ? TTS_CHARS_LIMIT_PRO : TTS_CHARS_LIMIT_BASIC;
  const usage = await getMonthlyUsage(uid);
  const used = usage?.ttsChars ?? 0;
  if (used + additionalChars > limit) {
    return {
      allowed: false,
      limit,
      used,
      message: `Monthly TTS limit reached (${limit} characters). Resets next month.`,
    };
  }
  return { allowed: true, limit, used };
}

/** Max AI generations for Pro (exported for usage API). */
export const AI_GENERATIONS_LIMIT = AI_GENERATIONS_LIMIT_PRO;
export const TTS_CHARS_LIMIT = TTS_CHARS_LIMIT_PRO;
export {
  AI_GENERATIONS_LIMIT_BASIC,
  AI_GENERATIONS_LIMIT_PRO,
  TTS_CHARS_LIMIT_BASIC,
  TTS_CHARS_LIMIT_PRO,
  STORAGE_BYTES_LIMIT_BASIC,
  STORAGE_BYTES_LIMIT_PRO,
  IMAGE_CREDIT_LIMIT_BASIC,
  IMAGE_CREDIT_LIMIT_PRO,
};

/**
 * Get total storage bytes used by user (Firebase Storage prefix users/{uid}/).
 * Uses Firestore cache (users/{uid}/usage/storage) with 15-min TTL to avoid listing on every request.
 * @param {string} uid
 * @param {{ skipCache?: boolean }} [opts]
 * @returns {Promise<number>}
 */
export async function getStorageUsage(uid, opts = {}) {
  if (!uid || !isAdminConfigured()) return 0;
  const db = getDb();
  const bucket = getAdminBucket();
  if (!db || !bucket) return 0;

  const cacheRef = db.collection("users").doc(uid).collection(USAGE_COLLECTION).doc(STORAGE_CACHE_DOC);
  if (!opts.skipCache) {
    const snap = await cacheRef.get();
    if (snap.exists) {
      const d = snap.data();
      const updatedAt = d?.updatedAt ? new Date(d.updatedAt).getTime() : 0;
      if (Date.now() - updatedAt < STORAGE_CACHE_TTL_MS) {
        return Math.max(0, Number(d?.bytes) || 0);
      }
    }
  }

  const prefix = `users/${uid}/`;
  let total = 0;
  try {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      const size = file.metadata?.size != null ? Number(file.metadata.size) : 0;
      if (!Number.isNaN(size)) total += size;
    }
  } catch (err) {
    console.error("[usage-limits] getStorageUsage list error:", err?.message || err);
    return 0;
  }

  try {
    await cacheRef.set(
      { bytes: total, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (e) {
    // non-fatal
  }
  return total;
}

/**
 * Check if user is within cloud backup storage limit (Basic 2GB, Pro 20GB; Free = 0).
 * @param {string} uid
 * @param {number} [additionalBytes=0]
 * @returns {Promise<{ allowed: boolean, used: number, limit: number, message?: string }>}
 */
export async function checkStorageLimit(uid, additionalBytes = 0) {
  if (!uid) {
    return { allowed: false, used: 0, limit: 0, message: "Authentication required" };
  }
  const tier = await getSubscriptionTier(uid);
  if (tier === "free") {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      message: "Active subscription required for cloud backup",
    };
  }
  const limit = tier === "pro" ? STORAGE_BYTES_LIMIT_PRO : STORAGE_BYTES_LIMIT_BASIC;
  const used = await getStorageUsage(uid);
  if (used + additionalBytes > limit) {
    return {
      allowed: false,
      used,
      limit,
      message: `Cloud backup limit reached (${formatStorageBytes(limit)}). Delete files or upgrade.`,
    };
  }
  return { allowed: true, used, limit };
}

function formatStorageBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${bytes / (1024 * 1024 * 1024)} GB`;
  if (bytes >= 1024 * 1024) return `${bytes / (1024 * 1024)} MB`;
  return `${bytes} B`;
}

/**
 * Get AI, TTS, storage, and image credit limits for a user by tier (for usage API).
 * @param {string} uid
 * @returns {Promise<{ aiLimit: number, ttsLimit: number, storageLimit: number, imageCreditLimit: number, tier: 'free'|'basic'|'pro' }>}
 */
export async function getLimitsForUser(uid) {
  const tier = await getSubscriptionTier(uid);
  const aiLimit = tier === "pro" ? AI_GENERATIONS_LIMIT_PRO : tier === "basic" ? AI_GENERATIONS_LIMIT_BASIC : 0;
  const ttsLimit = tier === "pro" ? TTS_CHARS_LIMIT_PRO : tier === "basic" ? TTS_CHARS_LIMIT_BASIC : 0;
  const storageLimit =
    tier === "pro" ? STORAGE_BYTES_LIMIT_PRO : tier === "basic" ? STORAGE_BYTES_LIMIT_BASIC : 0;
  const imageCreditLimit =
    tier === "pro" ? IMAGE_CREDIT_LIMIT_PRO : tier === "basic" ? IMAGE_CREDIT_LIMIT_BASIC : 0;
  return { aiLimit, ttsLimit, storageLimit, imageCreditLimit, tier };
}
