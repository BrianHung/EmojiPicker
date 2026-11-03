import { SKIN_TONES, unifiedToNative, type EmojiRecord } from "./dataset";
import type { SearchIndex } from "./search-index";

/** Slack writes skin tones as a second shortcode: :thumbsup::skin-tone-3: (2-6 map to tones 1-5). */
const SHORTCODE = /:([a-z0-9_+\-']+):(?::skin-tone-([2-6]):)?/gi;

/** Skin tone 1-5 of a variation, or 0 for the base emoji. */
export function toneOf(unified: string): number {
  for (const part of unified.split("-")) {
    const i = SKIN_TONES.indexOf(part as (typeof SKIN_TONES)[number]);
    if (i >= 0) return i + 1;
  }
  return 0;
}

const TONE_NAMES = ["light skin tone", "medium-light skin tone", "medium skin tone", "medium-dark skin tone", "dark skin tone"];

/** A name with the variation's skin tone, as emojibase writes it: "thumbs up: medium skin tone". */
export function nameWithTone(name: string, unified: string): string {
  const tone = toneOf(unified);
  return tone ? `${name}: ${TONE_NAMES[tone - 1]}` : name;
}

/** ":thumbsup:" or ":thumbsup::skin-tone-3:", or undefined when the emoji has no shortcode. */
export function formatShortcode(record: EmojiRecord, tone = 0): string | undefined {
  const code = record.shortcodes[0];
  if (!code) return undefined;
  return tone > 0 && record.tones.length ? `:${code}::skin-tone-${tone + 1}:` : `:${code}:`;
}

/** Replaces known :shortcodes: with emoji; unknown ones are left as typed. */
export function replaceShortcodes(text: string, index: SearchIndex): string {
  return text.replace(SHORTCODE, (match, code: string, slackTone?: string) => {
    const record = index.byShortcode(code);
    if (!record) return match;
    if (record.imageUrl) return match; // custom emoji have no text form
    const variation = slackTone ? record.tones[Number(slackTone) - 2] : undefined;
    return variation ? unifiedToNative(variation) : record.emoji;
  });
}
