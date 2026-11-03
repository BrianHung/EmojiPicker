// Turns whatever an app stores for an emoji (a native string, a shortcode, a unified
// code, a custom emoji, a record or a selection) into one thing to render.
import { isUnified, unifiedToNative, type EmojiRecord } from "./dataset";
import type { CustomEmoji, EmojiSelection } from "./store";

/** Anything that names one emoji. */
export type EmojiInput = string | CustomEmoji | EmojiRecord | EmojiSelection;

export type ResolvedEmoji = {
  /** Code to render: a unified sequence (skin tone kept as given) or a custom emoji id. */
  unified: string;
  /** The dataset record, when the store knows the emoji. */
  record?: EmojiRecord;
  /** Image of a custom emoji. */
  imageUrl?: string;
  /** Accessible name. */
  name: string;
  /** Native text; "" for custom emoji. */
  native: string;
};

/** The parts of the store resolution reads. */
export type EmojiLookup = {
  get(unified: string): EmojiRecord | undefined;
  fromShortcode(code: string): EmojiRecord | undefined;
};

// One emoji grapheme: starts with a pictograph, a regional indicator or a keycap base.
const NATIVE = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]️?⃣)/u;
// ":tada:" or ":+1::skin-tone-4:" (Slack's tones 2-6 are Fitzpatrick 1-5).
const COLON_CODE = /^:([a-z0-9_+\-']+):(?::skin-tone-([2-6]):)?$/i;
const BARE_CODE = /^[a-z0-9_+\-']+$/i;

/** "👍🏽" → "1f44d-1f3fd". */
export function nativeToUnified(text: string): string {
  return [...text].map((c) => c.codePointAt(0)!.toString(16)).join("-");
}

const isSelection = (v: object): v is EmojiSelection => "baseUnified" in v;
const isRecord = (v: object): v is EmojiRecord => "unified" in v && "tones" in v;
const isCustom = (v: object): v is CustomEmoji => "id" in v && "imageUrl" in v;

function fromRecord(record: EmojiRecord, unified = record.unified): ResolvedEmoji {
  return { unified, record, imageUrl: record.imageUrl, name: record.name, native: record.imageUrl ? "" : unifiedToNative(unified) };
}

/** A record by unified code, also trying the code with and without U+FE0F. */
function lookupUnified(store: EmojiLookup, unified: string): EmojiRecord | undefined {
  const bare = unified.replace(/-fe0f/gi, "");
  return store.get(unified) ?? store.get(bare) ?? (bare.includes("-") ? undefined : store.get(`${bare}-fe0f`));
}

/**
 * Resolves an emoji in this order: an object (selection, record, custom emoji), a
 * native emoji, a `:shortcode:`, a unified code or custom id, a bare shortcode.
 * Null when nothing matches (unknown, or the store isn't loaded yet). Native emoji
 * and unified codes resolve without data, since they can be drawn as they are.
 */
export function resolveEmoji(store: EmojiLookup, input: EmojiInput): ResolvedEmoji | null {
  if (typeof input === "object") {
    if (isSelection(input)) {
      const record = store.get(input.unified) ?? store.get(input.baseUnified);
      return { unified: input.unified, record, imageUrl: input.imageUrl, name: input.name, native: input.emoji };
    }
    if (isRecord(input)) return fromRecord(input);
    if (isCustom(input)) {
      const record = store.get(input.id);
      return { unified: input.id, record, imageUrl: input.imageUrl, name: input.name, native: "" };
    }
    return null;
  }

  const text = input.trim();
  if (!text) return null;

  if (NATIVE.test(text)) {
    const unified = nativeToUnified(text);
    const record = lookupUnified(store, unified);
    // Keep the skin tone (and FE0F) the text was written with.
    return record ? fromRecord(record, store.get(unified) ? unified : record.unified) : { unified, name: text, native: text };
  }

  const colon = COLON_CODE.exec(text);
  if (colon) {
    const record = store.fromShortcode(colon[1]!);
    if (!record) return null;
    const tone = colon[2] ? record.tones[Number(colon[2]) - 2] : undefined;
    return fromRecord(record, tone ?? record.unified);
  }

  const byId = store.get(text);
  if (byId) return fromRecord(byId, byId.imageUrl ? byId.unified : text.toLowerCase());
  if (BARE_CODE.test(text)) {
    const record = store.fromShortcode(text);
    if (record) return fromRecord(record);
  }
  // A unified code the store doesn't know (or data not loaded yet) is still drawable,
  // when it decodes to an emoji ("add" is hex, but not one).
  const native = isUnified(text) ? unifiedToNative(text) : "";
  if (native && NATIVE.test(native)) return { unified: text.toLowerCase(), name: text, native };
  return null;
}

/** What to show for input that resolves to nothing: shortcodes and ids as `:code:`, the rest as typed. */
export function missingEmojiText(input: EmojiInput): string {
  if (typeof input !== "string") return "id" in input ? `:${input.id}:` : input.name;
  const text = input.trim();
  return BARE_CODE.test(text) ? `:${text}:` : text;
}
