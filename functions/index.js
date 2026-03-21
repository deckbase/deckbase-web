/**
 * Firebase Cloud Functions — deckbase-prod
 *
 * Scheduled purge: soft-deleted decks/cards/templates/media past retention (default 30 days).
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { runPurgeSoftDeleted } from "./purgeSoftDeleted.js";

// Local emulator / odd environments: ensure default app exists
if (!getApps().length) {
  initializeApp();
}

function getDb() {
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  if (databaseId && databaseId !== "(default)") {
    return getFirestore(getApp(), databaseId);
  }
  return getFirestore();
}

function getDefaultBucket() {
  const explicit = process.env.PURGE_STORAGE_BUCKET?.trim();
  if (explicit) {
    return getStorage().bucket(explicit);
  }
  return getStorage().bucket();
}

/**
 * Daily purge of docs with is_deleted + deleted_at older than RETENTION_DAYS.
 * Schedule: 07:00 UTC (adjust timeZone / schedule as needed).
 *
 * Env (set in Google Cloud Console → Cloud Functions → this function → edit → Environment variables):
 * - PURGE_RETENTION_DAYS (default 30)
 * - PURGE_DRY_RUN=true to log only (default: unset / false = real deletes)
 * - FIRESTORE_DATABASE_ID if not (default)
 * - PURGE_STORAGE_BUCKET if default bucket name differs
 */
export const purgeSoftDeletedScheduled = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Etc/UTC",
    // Change if your prod workloads are in another region (e.g. asia-northeast1).
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => {
    const retentionDays = Number(process.env.PURGE_RETENTION_DAYS || 30);
    const dryRun = process.env.PURGE_DRY_RUN === "true";

    const db = getDb();
    const bucket = getDefaultBucket();

    logger.info("purgeSoftDeletedScheduled start", {
      retentionDays,
      dryRun,
      cutoff: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString(),
    });

    const stats = await runPurgeSoftDeleted(db, bucket, {
      retentionDays,
      dryRun,
      targetUid: null,
    });

    logger.info("purgeSoftDeletedScheduled done", stats);
  },
);
