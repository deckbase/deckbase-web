/**
 * Mobile parity: `card_preview_page.dart` / `_PreviewLayoutSpec`.
 * Deterministic preview card size (no transform scale).
 */

export const PREVIEW_LAYOUT = {
  horizontalPadding: 12,
  pageItemVerticalPaddingTotal: 16,
  pageItemVerticalPaddingHalf: 8,
  deckViewportFraction: 1,
  cardAspectRatio: 9 / 16,
  overlayInset: 8,
  overlayMinHeight: 36,
  cardBorderRadius: 20,
  cardInnerPadding: 24,
  blockGapY: 16,
  /** Reserved top band when card has a back face (8*2 + 36). */
  reservedTopOverlay: 8 * 2 + 36,
};

/**
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @param {boolean} reserveTopOverlay - true when template has front + back
 * @returns {{ width: number, height: number }}
 */
export function resolveCardSize(maxWidth, maxHeight, reserveTopOverlay) {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    return { width: 0, height: 0 };
  }
  let usableHeight;
  if (!Number.isFinite(maxHeight) || maxHeight <= 0) {
    const height = maxWidth / PREVIEW_LAYOUT.cardAspectRatio;
    return { width: maxWidth, height };
  }
  if (reserveTopOverlay) {
    const reservedTop = PREVIEW_LAYOUT.reservedTopOverlay;
    const candidate = Math.max(0, maxHeight - reservedTop);
    usableHeight = candidate <= 0 ? maxHeight : candidate;
  } else {
    usableHeight = maxHeight;
  }
  const widthByHeight = usableHeight * PREVIEW_LAYOUT.cardAspectRatio;
  const cardW = Math.min(maxWidth, widthByHeight);
  const cardH = cardW / PREVIEW_LAYOUT.cardAspectRatio;
  return { width: cardW, height: cardH };
}

export function previewHeroTag(prefix, cardId, face) {
  const id = cardId ?? "sample";
  const side = face === "back" ? "back" : "front";
  return `${prefix}_${id}_${side}`;
}
