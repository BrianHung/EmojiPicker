import { isUnified, nativeToUnified, unifiedToNative, withoutFe0f, type EmojiRecord } from "./dataset";
import type { CustomEmoji, EmojiSelection } from "./store";

export type EmojiInput = string | CustomEmoji | EmojiRecord | EmojiSelection;

export type ResolvedEmoji = {
  unified: string;
  record?: EmojiRecord;
  imageUrl?: string;
  name: string;
  native: string;
};

export type EmojiLookup = {
  get(unified: string): EmojiRecord | undefined;
  fromShortcode(code: string): EmojiRecord | undefined;
};

const NATIVE = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]️?⃣)/u;
const COLON_CODE = /^:([a-z0-9_+\-']+):(?::skin-tone-([2-6]):)?$/i;
const BARE_CODE = /^[a-z0-9_+\-']+$/i;

const isSelection = (v: object): v is EmojiSelection => "baseUnified" in v && typeof v.baseUnified === "string" && "unified" in v && typeof v.unified === "string";
const isRecord = (v: object): v is EmojiRecord => "unified" in v && typeof v.unified === "string" && "tones" in v && Array.isArray(v.tones);

// A custom emoji given as input: an id and an image, unlike a record or a selection
export const isCustomEmoji = (v: object): v is CustomEmoji => "id" in v && typeof v.id === "string" && "imageUrl" in v && typeof v.imageUrl === "string";

function fromRecord(record: EmojiRecord, unified = record.unified): ResolvedEmoji {
  return { unified, record, imageUrl: record.imageUrl, name: record.name, native: record.imageUrl ? "" : unifiedToNative(unified) };
}

function lookupUnified(store: EmojiLookup, unified: string): EmojiRecord | undefined {
  const bare = withoutFe0f(unified);
  return store.get(unified) ?? store.get(bare) ?? (bare.includes("-") ? undefined : store.get(`${bare}-fe0f`));
}

export function resolveEmoji(store: EmojiLookup, input: EmojiInput): ResolvedEmoji | null {
  if (typeof input === "object") {
    if (isSelection(input)) {
      const record = store.get(input.unified) ?? store.get(input.baseUnified);
      return { unified: input.unified, record, imageUrl: input.imageUrl, name: input.name, native: input.emoji };
    }
    if (isRecord(input)) return fromRecord(input);
    if (isCustomEmoji(input)) {
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
  const native = isUnified(text) ? unifiedToNative(text) : "";
  if (native && NATIVE.test(native)) return { unified: text.toLowerCase(), name: text, native };
  return null;
}

export function missingEmojiText(input: EmojiInput): string {
  if (typeof input !== "string") return isCustomEmoji(input) ? `:${input.id}:` : input.name;
  const text = input.trim();
  return BARE_CODE.test(text) ? `:${text}:` : text;
}
