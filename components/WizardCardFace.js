"use client";

/**
 * Wizard world card face — Yu-Gi-Oh! style.
 * NAME
 * Type • Archetype • Rarity
 * ATK / DEF
 * [Trigger] When the correct synonym is selected.
 * [Effect] Gain XP equal to ATK. If failed, streak is reduced by 1.
 * [Bonus] (optional) If resolved in Typed Mode, gain +15% XP.
 * [Tag] e.g. Emotion
 * Learning mechanic stays central; TCG flavor layers on top.
 */

const TRIGGER_TEXT = "When the correct synonym is selected.";
const EFFECT_LINE_1 = "Gain XP equal to ATK.";
const EFFECT_LINE_2 = "If failed, streak is reduced by 1.";
const BONUS_TEXT = "If resolved in Typed Mode, gain +15% XP.";
const DEFAULT_TAG = "Emotion";

const RARITY_COLORS = {
  common: "text-white/80",
  rare: "text-blue-300",
  epic: "text-purple-300",
  legendary: "text-amber-300",
};

export function WizardCardFace({
  name,
  type = "Spell",
  archetype = "Vocabulary",
  rarity = "common",
  atk = 0,
  def = 0,
  challengeType,
  tag = DEFAULT_TAG,
  showBonus = true,
}) {
  const isTypedMode = challengeType === "text";
  const rarityClass = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;

  return (
    <div className="border-b border-white/10 bg-gradient-to-b from-white/10 to-transparent p-5">
      <h2 className="text-xl font-bold text-white mb-1 truncate" title={name}>
        {name || "Unknown"}
      </h2>
      <p className="text-sm text-white/60 mb-3">
        <span>{type}</span>
        <span className="mx-1.5">•</span>
        <span>{archetype}</span>
        <span className="mx-1.5">•</span>
        <span className={rarityClass}>{rarity}</span>
      </p>
      <div className="flex gap-4 text-sm mb-4">
        <span className="text-amber-400/90 font-medium">ATK {atk}</span>
        <span className="text-white/50">/</span>
        <span className="text-blue-400/90 font-medium">DEF {def}</span>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-white/70">
          <span className="font-semibold text-white/90">[Trigger]</span> {TRIGGER_TEXT}
        </p>
        <p className="text-white/70">
          <span className="font-semibold text-white/90">[Effect]</span> {EFFECT_LINE_1}
          <br />
          {EFFECT_LINE_2}
        </p>
        {showBonus && (
          <p className="text-amber-300/90">
            <span className="font-semibold text-amber-200">[Bonus] (optional)</span> {BONUS_TEXT}
          </p>
        )}
        <p className="text-white/50 pt-1">
          <span className="font-semibold text-white/60">[Tag]</span> {tag}
        </p>
      </div>
    </div>
  );
}
