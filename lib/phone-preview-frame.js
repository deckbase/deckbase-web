/**
 * 9:16 phone chrome for card / template library preview.
 * Caps height so the frame never exceeds the window (wide + short viewports).
 *
 * height = min(available parent height, vertical budget from dvh, natural height from width cap)
 * width follows aspect-ratio from height.
 */

/** Card preview route: full width minus dashboard nav (~3.5rem) is already outer shell; inner phone uses dvh budget. */
export const CARD_PREVIEW_PHONE_STYLE = {
  aspectRatio: "9 / 16",
  height:
    "min(100%, calc(100dvh - 6rem), calc(min(96vw, 32rem) * 16 / 9))",
  width: "auto",
  maxWidth: "min(96vw, 32rem)",
};

/**
 * Template library preview: extra top bar (title, actions) — tighter dvh budget so the phone fits below it.
 */
export const LIBRARY_TEMPLATE_PHONE_STYLE = {
  aspectRatio: "9 / 16",
  height:
    "min(100%, calc(100dvh - 10rem), calc(min(96vw, 32rem) * 16 / 9))",
  width: "auto",
  maxWidth: "min(96vw, 32rem)",
};
