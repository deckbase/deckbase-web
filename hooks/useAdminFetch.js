"use client";

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * fetch() with Firebase ID token for admin-only API routes.
 */
export function useAdminFetch() {
  const { user } = useAuth();

  return useCallback(
    async (input, init = {}) => {
      if (!user) {
        throw new Error("Not signed in");
      }
      const token = await user.getIdToken();
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [user],
  );
}
