import type { EmojiProviderProps } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const provider = rowsOf<EmojiProviderProps>()([
  { name: "data", type: "Dataset | string | (({ signal }) => Promise<Dataset>)", description: "A URL, a loader or a dataset object." },
  { name: "customEmojis", type: "CustomEmojiSource | CustomEmojiSource[]", description: "Custom emoji, pack URLs or loaders: { id, name, imageUrl, shortcodes?, tags?, group? }" },
  { name: "filter", type: "(record: EmojiRecord) => boolean", description: "Excludes emoji from the picker and search." },
  { name: "searchEngine", type: "EmojiSearch", default: "lexical()", description: "(query, context) => hits | Promise<hits>" },
  { name: "renderer", type: '"auto" | "native" | "image"', default: '"auto"', description: "auto draws images where the system can't draw emoji natively." },
  {
    name: "imageUrl",
    type: "(unified, { renderer }) => string | undefined",
    default: "Twemoji when renderer is image",
    description: "Image URL per emoji; undefined draws it natively. Return a URL under the native renderer to replace particular emoji.",
  },
  { name: "imageVersion", type: "number", default: "17", description: "Newest emoji version your image set draws." },
  { name: "frequents", type: "Record<unified, { count, lastUsed }>", description: "Frequently used emoji, controlled; count decays by half every 14 days." },
  { name: "defaultFrequents", type: "Record<unified, { count, lastUsed }>", description: "Used when frequentsStorage holds nothing." },
  { name: "onFrequentsChange", type: '(frequents, details: { reason: "pick" | "remove" | "clear", emoji?, cancel() }) => void' },
  { name: "frequentsStorage", type: "EmojiStorage | null", default: "localStorage", description: "Where uncontrolled frequents persist, synced across tabs; null keeps them in memory." },
  { name: "skinTone", type: "SkinToneValue", description: "The skin tone, controlled: 0 (none) or 1–5, the Fitzpatrick tones." },
  { name: "defaultSkinTone", type: "SkinToneValue", default: "0" },
  { name: "onSkinToneChange", type: '(tone: SkinToneValue, details: { reason: "option-press" | "none", event?, cancel() }) => void' },
  { name: "skinToneStorage", type: "EmojiStorage | null", default: "localStorage", description: "Where the skin tone persists, synced across tabs; null keeps it in memory." },
  { name: "locale", type: "string", default: "the dataset's", description: "BCP 47 tag for search, A–Z order and the labels' counts." },
  { name: "labels", type: "Partial<EmojiLabels>", default: "defaultLabels", description: "Every string the pickers show or announce." },
  { name: "prepare", type: "boolean", default: "true", description: "Loads data and builds the index when idle." },
]);
