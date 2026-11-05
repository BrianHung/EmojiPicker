import { SKIN_TONES, unifiedToNative, type EmojiRecord, type SkinToneValue } from "./dataset";
import { defaultLabels, type EmojiLabels } from "./labels";
import type { SearchIndex } from "./search/search-index";

const SHORTCODE = /:([\p{L}\p{M}\p{N}_+\-']+):(?::skin-tone-([2-6]):)?/giu;

const TRIGGER = /(?:^|[\s([{>]|(?<=[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]))([:：]([\p{L}\p{M}\p{N}_+\-']+))$/u;
const ASCII = /^[\x00-\x7f]*$/;

export function findShortcodeTrigger(text: string): { query: string; offset: number } | null {
  const match = TRIGGER.exec(text);
  if (!match || (ASCII.test(match[2]!) && match[2]!.length < 2)) return null;
  return { query: match[2]!, offset: text.length - match[1]!.length };
}

// Safari reports the Enter that commits an IME composition as keyCode 229
export const isComposingKey = (event: { isComposing?: boolean; keyCode?: number }) => !!event.isComposing || event.keyCode === 229;

export function toneOf(unified: string): SkinToneValue {
  for (const part of unified.split("-")) {
    const i = SKIN_TONES.indexOf(part as (typeof SKIN_TONES)[number]);
    if (i >= 0) return (i + 1) as SkinToneValue;
  }
  return 0;
}

export function nameWithTone(name: string, unified: string, format: EmojiLabels["withSkinTone"] = defaultLabels.withSkinTone): string {
  const tone = toneOf(unified);
  return tone ? format(name, tone) : name;
}

export function formatShortcode(record: EmojiRecord, tone = 0): string | undefined {
  const code = record.shortcodes[0];
  if (!code) return undefined;
  return tone > 0 && record.tones.length ? `:${code}::skin-tone-${tone + 1}:` : `:${code}:`;
}

export function replaceShortcodes(text: string, index: SearchIndex): string {
  return text.replace(SHORTCODE, (match, code: string, toneCode?: string) => {
    const record = index.byShortcode(code);
    if (!record) return match;
    if (record.imageUrl) return match;
    const variation = toneCode ? record.tones[Number(toneCode) - 2] : undefined;
    return variation ? unifiedToNative(variation) : record.emoji;
  });
}
