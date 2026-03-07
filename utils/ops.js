"use client";

/**
 * Op-based sync: emit and consume ops at users/{uid}/ops for cross-platform (web/mobile) sync.
 * Device ID and HLC are client-only (localStorage + in-memory).
 */

import { collection, doc, setDoc, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/utils/firebase";

const DEVICE_ID_KEY = "deckbase_device_id";
const OPS_CURSOR_KEY = "deckbase_ops_cursor";

let lastHlcMs = 0;
let hlcCounter = 0;

/** Stable device id for this browser (localStorage). */
export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Hybrid logical clock: comparable integer (max 4096 ops per ms). */
export function nextHlc() {
  const now = Date.now();
  if (now > lastHlcMs) {
    lastHlcMs = now;
    hlcCounter = 0;
  }
  hlcCounter++;
  if (hlcCounter >= 4096) {
    lastHlcMs++;
    hlcCounter = 0;
  }
  return lastHlcMs * 4096 + hlcCounter;
}

/**
 * Emit a single op to users/{uid}/ops/{op_id}.
 * @param {string} uid - User id
 * @param {string} entityType - "deck" | "card"
 * @param {string} entityId - Deck id or card id
 * @param {string} opType - "create" | "update" | "delete"
 * @param {object} payload - Full entity (snake_case) for create/update; for delete can be {} or { is_deleted: true, updated_at: ms }
 */
export async function emitOp(uid, entityType, entityId, opType, payload) {
  if (!db || typeof window === "undefined") return;
  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return;

  const opId = crypto.randomUUID?.() ?? `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const op = {
    op_id: opId,
    device_id: deviceId,
    hlc: nextHlc(),
    entity_type: entityType,
    entity_id: entityId,
    op_type: opType,
    payload: payload ?? {},
    created_at: Date.now(),
  };

  const opRef = doc(db, "users", uid, "ops", opId);
  await setDoc(opRef, op);
}

/**
 * Get the last applied HLC cursor from localStorage.
 */
export function getOpsCursor() {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(OPS_CURSOR_KEY);
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Persist the ops cursor after applying ops.
 */
export function setOpsCursor(hlc) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OPS_CURSOR_KEY, String(hlc));
}

/**
 * Subscribe to new ops (hlc > cursor) and invoke onOp for each op from other devices.
 * Caller should apply the op (e.g. write payload to decks/cards) and can use getOrCreateDeviceId() to skip own ops elsewhere if needed.
 * @param {string} uid - User id
 * @param {(op: { op_id: string, device_id: string, hlc: number, entity_type: string, entity_id: string, op_type: string, payload: object, created_at: number }) => void|Promise<void>} onOp - Called for each op to apply
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToOps(uid, onOp) {
  if (!db || typeof window === "undefined") return () => {};
  const deviceId = getOrCreateDeviceId();
  const cursor = getOpsCursor();
  const opsRef = collection(db, "users", uid, "ops");
  const q = query(
    opsRef,
    where("hlc", ">", cursor),
    orderBy("hlc", "asc"),
    limit(500)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const docs = [...snapshot.docs].sort(
      (a, b) => (a.data().hlc ?? 0) - (b.data().hlc ?? 0)
    );
    let maxHlc = cursor;
    for (const d of docs) {
      const op = d.data();
      if (op.device_id !== deviceId) {
        try {
          const result = onOp(op);
          if (result && typeof result.then === "function") {
            result.catch((err) => console.error("apply op error", op.op_id, err));
          }
        } catch (err) {
          console.error("apply op error", op.op_id, err);
        }
      }
      if ((op.hlc ?? 0) > maxHlc) maxHlc = op.hlc;
    }
    if (maxHlc > cursor) setOpsCursor(maxHlc);
  });

  return unsubscribe;
}
