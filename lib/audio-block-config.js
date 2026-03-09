/**
 * Normalize audio block config from template/card block.
 * Supports both camelCase and snake_case when reading (mobile may send snake_case).
 * See docs/WEB_AUDIO_BLOCK_SETTINGS.md.
 *
 * @param {string|object|null} configJson - Raw config: JSON string or parsed object
 * @param {{ mainBlockId?: string }} [options] - Optional. mainBlockId used as default for defaultSourceBlockId when missing
 * @returns {{ defaultVoiceId?: string, defaultSourceBlockId?: string, autoPlay: boolean }}
 */
export function parseAudioBlockConfig(configJson, options = {}) {
  const raw =
    typeof configJson === "string"
      ? (() => {
          try {
            return JSON.parse(configJson || "{}");
          } catch {
            return {};
          }
        })()
      : configJson || {};
  const mainBlockId = options.mainBlockId;
  return {
    defaultVoiceId: raw.defaultVoiceId ?? raw.default_voice_id ?? undefined,
    defaultSourceBlockId:
      raw.defaultSourceBlockId ??
      raw.default_source_block_id ??
      (mainBlockId ?? undefined),
    autoPlay: raw.autoPlay === true,
  };
}
