/**
 * Server-only: comma/semicolon/whitespace-separated emails in ADMIN_EMAILS.
 * If unset or empty, no user is treated as admin (deny-by-default).
 */

export function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  const set = parseAdminEmails();
  if (set.size === 0) return false;
  return set.has(email.trim().toLowerCase());
}
