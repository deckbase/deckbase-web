/**
 * Server-only usage tracking and plan limits.
 * Stores monthly usage in Firestore: users/{uid}/usage/{monthKey}
 * monthKey = "YYYY-MM". Limits from PRICING.md: Free = 0, Basic = 250 AI / 30K TTS / 2GB, Pro = 600 AI / 50K TTS / 20GB.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, getAdminBucket, isAdminConfigured } from "@/utils/firebase-admin";
import { getSubscriptionTier, isBasicOrProOrVip } from "@/lib/revenuecat-server";

const USAGE_COLLECTION = "usage";
const STORAGE_CACHE_DOC = "storage";
const STORAGE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

const AI_GENERATIONS_LIMIT_BASIC = 250;
const AI_GENERATIONS_LIMIT_PRO = 600;
const TTS_CHARS_LIMIT_BASIC = 30000;
const TTS_CHARS_LIMIT_PRO = 50000;
const STORAGE_BYTES_LIMIT_BASIC = 2 * 1024 * 1024 * 1024; // 2GB
const STORAGE_BYTES_LIMIT_PRO = 20 * 1024 * 1024 * 1024; // 20GB

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
 * @returns {{ aiGenerations: number, ttsChars: number } | null }
 */
export async function getMonthlyUsage(uid) {
  if (!uid || !isAdminConfigured()) return null;
  const db = getDb();
  if (!db) return null;
  const ref = db.collection("users").doc(uid).collection(USAGE_COLLECTION).doc(getMonthKey());
  const snap = await ref.get();
  if (!snap.exists) return { aiGenerations: 0, ttsChars: 0 };
  const d = snap.data();
  return {
    aiGenerations: Math.max(0, Number(d.aiGenerations) || 0),
    ttsChars: Math.max(0, Number(d.ttsChars) || 0),
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
 * Get AI, TTS, and storage limits for a user by tier (for usage API).
 * @param {string} uid
 * @returns {Promise<{ aiLimit: number, ttsLimit: number, storageLimit: number, tier: 'free'|'basic'|'pro' }>}
 */
export async function getLimitsForUser(uid) {
  const tier = await getSubscriptionTier(uid);
  const aiLimit = tier === "pro" ? AI_GENERATIONS_LIMIT_PRO : tier === "basic" ? AI_GENERATIONS_LIMIT_BASIC : 0;
  const ttsLimit = tier === "pro" ? TTS_CHARS_LIMIT_PRO : tier === "basic" ? TTS_CHARS_LIMIT_BASIC : 0;
  const storageLimit =
    tier === "pro" ? STORAGE_BYTES_LIMIT_PRO : tier === "basic" ? STORAGE_BYTES_LIMIT_BASIC : 0;
  return { aiLimit, ttsLimit, storageLimit, tier };
}
