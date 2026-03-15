/**
 * Server-only usage tracking and plan limits.
 * Stores monthly usage in Firestore: users/{uid}/usage/{monthKey}
 * monthKey = "YYYY-MM". Limits from PRICING.md (Pro: 600 AI/mo, 50K TTS chars/mo).
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, isAdminConfigured } from "@/utils/firebase-admin";
import { isProOrVip } from "@/lib/revenuecat-server";

const USAGE_COLLECTION = "usage";

/** Current plan only has "pro"; use Pro limits. When Basic is added, resolve from RevenueCat. */
const AI_GENERATIONS_LIMIT_PRO = 600;
const TTS_CHARS_LIMIT_PRO = 50000;

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
 * Check if user can use AI generation (subscribed and under limit).
 * @returns {{ allowed: boolean, limit: number, used: number, message?: string }}
 */
export async function checkAIGenerationLimit(uid) {
  if (!uid) {
    return { allowed: false, limit: 0, used: 0, message: "Authentication required" };
  }
  const entitled = await isProOrVip(uid);
  if (!entitled) {
    return {
      allowed: false,
      limit: 0,
      used: 0,
      message: "Active subscription required to use AI features",
    };
  }
  const limit = AI_GENERATIONS_LIMIT_PRO;
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
 * Check if user can use TTS (subscribed and under char limit). If adding `additionalChars`, check that used + additionalChars <= limit.
 * @param {string} uid
 * @param {number} [additionalChars=0]
 * @returns {{ allowed: boolean, limit: number, used: number, message?: string }}
 */
export async function checkTTSLimit(uid, additionalChars = 0) {
  if (!uid) {
    return { allowed: false, limit: 0, used: 0, message: "Authentication required" };
  }
  const entitled = await isProOrVip(uid);
  if (!entitled) {
    return {
      allowed: false,
      limit: 0,
      used: 0,
      message: "Pro subscription required for text-to-speech",
    };
  }
  const limit = TTS_CHARS_LIMIT_PRO;
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

export const AI_GENERATIONS_LIMIT = AI_GENERATIONS_LIMIT_PRO;
export const TTS_CHARS_LIMIT = TTS_CHARS_LIMIT_PRO;
