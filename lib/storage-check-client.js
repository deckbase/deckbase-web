/**
 * Client-only: check cloud backup limit before upload.
 * In development, skips the check (allowed: true). In production, calls POST /api/user/storage-check.
 * @param {import("firebase/auth").User} user - Firebase user (for getIdToken)
 * @param {number} [additionalBytes=0] - Size of the file(s) to upload
 * @returns {Promise<{ allowed: boolean, used?: number, limit?: number, message?: string }>}
 */
export async function checkStorageBeforeUpload(user, additionalBytes = 0) {
  if (!user) return { allowed: false, message: "Authentication required" };
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    return { allowed: true };
  }
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/user/storage-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ additionalBytes: Number(additionalBytes) || 0 }),
    });
    const data = await res.json();
    return {
      allowed: !!data.allowed,
      used: data.used,
      limit: data.limit,
      message: data.message || (data.allowed ? undefined : "Cloud backup limit reached."),
    };
  } catch (err) {
    console.warn("[storage-check]", err);
    return { allowed: true, message: undefined }; // allow upload on network error to avoid blocking
  }
}
