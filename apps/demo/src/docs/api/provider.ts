import type { EmojiProviderProps } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const provider = rowsOf<EmojiProviderProps>()([
  { name: "data", type: "Dataset | EmojiDataInput | string | (({ signal }) => Promise<Dataset | EmojiDataInput>)", default: "core's en.json on jsDelivr", description: "A URL, a loader, or a dataset object." },
  { name: "customEmojis", type: "CustomEmojiSource | CustomEmojiSource[]", description: "Custom emoji, pack URLs, or loaders: { id, name, imageUrl, shortcodes?, tags?, group? }." },
  { name: "filter", type: "(record: EmojiRecord) => boolean", description: "Excludes emoji from the picker and search." },
  { name: "searchEngine", type: "EmojiSearch", default: "lexical()", description: "The search function. See Search." },
  { name: "renderer", type: '"auto" | "native" | "image"', default: '"auto"', description: "auto draws images where the system cannot draw an emoji natively." },
  {
    name: "imageUrl",
    type: "(unified, { renderer }) => string | undefined",
    default: "Twemoji when renderer is image",
    description: "Image URL per emoji; undefined draws it natively. Return a URL under the native renderer to replace particular emoji.",
  },
  { name: "imageVersion", type: "number", default: "17", description: "Newest emoji version your image set draws." },
  { name: "frequents", type: "Record<unified, { count, lastUsed }>", description: "Frequently used emoji. count halves every frequentsTuning.halfLifeDays days (default 14). Controlled." },
  { name: "defaultFrequents", type: "Record<unified, { count, lastUsed }>", description: "Used when storage.frequents holds nothing." },
  { name: "onFrequentsChange", type: '(frequents, details: { reason: "pick" | "remove" | "clear", emoji?, cancel() }) => void' },
  { name: "frequentsTuning", type: "{ halfLifeDays?, max? }", default: "{ halfLifeDays: 14, max: 64 }", description: "halfLifeDays: days until a use counts half. max: number of emoji the history keeps." },
  { name: "skinTone", type: "SkinToneValue", description: "The skin tone: 0 (none) or 1–5, light to dark. Controlled." },
  { name: "defaultSkinTone", type: "SkinToneValue", default: "0" },
  { name: "onSkinToneChange", type: '(tone: SkinToneValue, details: { reason: "item-press" | "none", event?, cancel() }) => void' },
  {
    name: "storage",
    type: "{ frequents?, skinTone?: EmojiStorage | null }",
    default: "localStorageAdapter(key)",
    description: "Where uncontrolled frequently used emoji and skin tone persist, synced across tabs. null for either key keeps that value in memory.",
  },
  { name: "locale", type: "string", default: "the dataset's", description: "BCP 47 tag for search, A–Z order, and the labels' counts." },
  { name: "labels", type: "Partial<EmojiLabels>", default: "defaultLabels", description: "Every string the pickers show or announce." },
  { name: "prepare", type: "boolean", default: "true", description: "Loads data and builds the index when idle." },
]);
