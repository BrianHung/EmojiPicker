import { SKIN_TONES, unifiedToNative, type EmojiRecord } from "./dataset";
import { defaultLabels, type EmojiLabels } from "./labels";
import type { SearchIndex } from "./search/search-index";

/** Slack writes skin tones as a second shortcode: :thumbsup::skin-tone-3: (2-6 map to tones 1-5). Localized codes may be in any script. */
const SHORTCODE = /:([\p{L}\p{M}\p{N}_+\-']+):(?::skin-tone-([2-6]):)?/giu;

// A ":" (or Japanese/Chinese full-width "：") after a space, bracket or CJK character, then the query up to the caret.
const TRIGGER = /(?:^|[\s([{>]|(?<=[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]))([:：]([\p{L}\p{M}\p{N}_+\-']+))$/u;
const ASCII = /^[\x00-\x7f]*$/;

/** The `:query` that `text` (what's before the caret) ends with, and the offset of its colon. ASCII queries need 2+ characters; one kanji or kana is enough. */
export function findShortcodeTrigger(text: string): { query: string; offset: number } | null {
  const match = TRIGGER.exec(text);
  if (!match || (ASCII.test(match[2]!) && match[2]!.length < 2)) return null;
  return { query: match[2]!, offset: text.length - match[1]!.length };
}

/** A key pressed while an IME is composing (Japanese, Chinese…), which belongs to the IME. Safari reports the Enter that commits as keyCode 229. */
export const isComposingKey = (event: { isComposing?: boolean; keyCode?: number }) => !!event.isComposing || event.keyCode === 229;

/** Skin tone 1-5 of a variation, or 0 for the base emoji. */
export function toneOf(unified: string): number {
  for (const part of unified.split("-")) {
    const i = SKIN_TONES.indexOf(part as (typeof SKIN_TONES)[number]);
    if (i >= 0) return i + 1;
  }
  return 0;
}

/** A name with the variation's skin tone, as emojibase writes it: "thumbs up: medium skin tone". */
export function nameWithTone(name: string, unified: string, format: EmojiLabels["withSkinTone"] = defaultLabels.withSkinTone): string {
  const tone = toneOf(unified);
  return tone ? format(name, tone) : name;
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
