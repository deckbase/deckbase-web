/**
 * Opt-in debug logging for deck card preview / CardPreviewContent.
 * - Enabled in development automatically (uses console.log so messages show in the default console).
 * - In production: set localStorage `deckbase:previewDebug` to `"1"` and refresh.
 * - Extra-noisy ResizeObserver ticks: `deckbase:previewDebugVerbose` to `"1"`.
 */
let bootLogged = false;

export function isPreviewDebugEnabled() {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") return true;
  try {
    return window.localStorage?.getItem("deckbase:previewDebug") === "1";
  } catch {
    return false;
  }
}

export function isPreviewDebugVerbose() {
  if (typeof window === "undefined") return false;
  if (!isPreviewDebugEnabled()) return false;
  try {
    return window.localStorage?.getItem("deckbase:previewDebugVerbose") === "1";
  } catch {
    return false;
  }
}

function logBootOnce() {
  if (bootLogged || typeof window === "undefined") return;
  bootLogged = true;
  const v = isPreviewDebugVerbose();
  console.log(
    "[preview] logging enabled — default: dev / or localStorage deckbase:previewDebug=1 | verbose resize: deckbase:previewDebugVerbose=1",
    { verbose: v },
  );
}

export function previewDebugLog(scope, message, payload) {
  if (!isPreviewDebugEnabled()) return;
  logBootOnce();
  if (payload !== undefined) {
    console.log(`[preview:${scope}] ${message}`, payload);
  } else {
    console.log(`[preview:${scope}] ${message}`);
  }
}

/** Every ResizeObserver tick (can be very noisy). */
export function previewDebugLogVerbose(scope, message, payload) {
  if (!isPreviewDebugEnabled() || !isPreviewDebugVerbose()) return;
  logBootOnce();
  if (payload !== undefined) {
    console.log(`[preview:${scope}:verbose] ${message}`, payload);
  } else {
    console.log(`[preview:${scope}:verbose] ${message}`);
  }
}
