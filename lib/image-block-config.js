/**
 * Image block config: crop aspect ratio.
 * Stored in block.configJson.cropAspect (template + card blocks_snapshot).
 * Synced via Firebase; mobile should read cropAspect when showing crop UI.
 *
 * Values: 1 (1:1), 1.91 (1.91:1), 0.8 (4:5)
 */
export const CROP_ASPECT_OPTIONS = [
  { label: "1:1", value: 1 },
  { label: "1.91:1", value: 1.91 },
  { label: "4:5", value: 4 / 5 },
];

const VALID_ASPECTS = new Set(CROP_ASPECT_OPTIONS.map((o) => o.value));

/**
 * Default crop aspect when not set in config.
 */
export const DEFAULT_CROP_ASPECT = 1;

/**
 * Get crop aspect from block config (template or card block).
 * Supports camelCase (cropAspect) and snake_case (crop_aspect) for mobile.
 * @param {Object} config - Parsed block config (from configJson)
 * @returns {number}
 */
export function getCropAspectFromConfig(config) {
  if (!config) return DEFAULT_CROP_ASPECT;
  const v = config.cropAspect ?? config.crop_aspect;
  if (v == null) return DEFAULT_CROP_ASPECT;
  const n = Number(v);
  return VALID_ASPECTS.has(n) ? n : DEFAULT_CROP_ASPECT;
}

/**
 * Get saved crop position and zoom from block config (for restoring crop modal state).
 * Stored as cropX, cropY (0-100, react-easy-crop percentage) and cropZoom (1-3).
 * @param {Object} config - Parsed block config (from configJson)
 * @returns {{ crop: { x: number, y: number }, zoom: number } | null}
 */
export function getCropStateFromConfig(config) {
  if (!config) return null;
  const x = config.cropX ?? config.crop_x;
  const y = config.cropY ?? config.crop_y;
  const z = config.cropZoom ?? config.crop_zoom;
  if (x == null || y == null || z == null) return null;
  const nx = Number(x);
  const ny = Number(y);
  const nz = Number(z);
  if (Number.isNaN(nx) || Number.isNaN(ny) || Number.isNaN(nz)) return null;
  if (nz < 1 || nz > 3) return null;
  return { crop: { x: nx, y: ny }, zoom: nz };
}
