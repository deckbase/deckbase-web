"use client";

import { useEffect } from "react";
import { subscribeToOps } from "@/utils/ops";
import { applyOpFromSync } from "@/utils/firestore";

/**
 * Subscribe to users/{uid}/ops and apply incoming ops (from mobile or other tabs) to decks/cards.
 * Call once when the user is logged in (e.g. in dashboard layout).
 */
export function useOpsSync(uid) {
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToOps(uid, (op) => applyOpFromSync(uid, op));
    return () => unsubscribe();
  }, [uid]);
}
