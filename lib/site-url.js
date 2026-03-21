/**
 * Canonical marketing site origin. Defaults to www (matches live host / audit).
 * Override with NEXT_PUBLIC_SITE_URL for staging (e.g. https://dev.deckbase.co).
 */
const raw = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.deckbase.co").trim();
export const SITE_URL = raw.replace(/\/$/, "");

/**
 * Absolute URL for a pathname (must start with /).
 * @param {string} pathname - e.g. "/features"
 */
export function absoluteUrl(pathname = "/") {
  if (!pathname || pathname === "/") return SITE_URL;
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${p}`;
}
