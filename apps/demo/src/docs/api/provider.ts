import type { EmojiProvider } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const provider = rowsOf<EmojiProvider.Props>()([
  { name: "data", type: "Dataset | EmojiDataInput | string | (({ signal }) => Promise<Dataset | EmojiDataInput>)", default: 'localeData("en") on jsDelivr', description: "A URL, a loader, or a dataset object." },
  { name: "customEmojis", type: "CustomEmoji[] | (({ signal }) => Promise<CustomEmoji[]>)", description: "Custom emoji, or a loader for them: { id, name, imageUrl, shortcodes?, tags?, group? }." },
  { name: "filter", type: "(record: EmojiRecord) => boolean", description: "Excludes emoji, custom emoji included, from the picker and search." },
  { name: "search", type: "EmojiSearch", default: "lexical()", description: "The search function. See Search." },
  { name: "renderer", type: '"auto" | "native" | "image"', default: '"auto"', description: "auto draws images where the system cannot draw an emoji natively." },
  {
    name: "imageUrl",
    type: "(unified, { renderer }) => string | undefined",
    default: "Twemoji when renderer is image",
    description: "Image URL per emoji; undefined draws it natively. Return a URL under the native renderer to replace particular emoji.",
  },
  { name: "imageVersion", type: "number", default: "17", description: "Newest emoji version your image set draws." },
  { name: "frequents", type: "Record<unified, { count, lastUsed }>", description: "Frequently used emoji. count halves every 14 days. Controlled; uncontrolled ones persist to localStorage." },
  { name: "defaultFrequents", type: "Record<unified, { count, lastUsed }>", default: "six common emoji", description: "Used when localStorage holds nothing. Its entries can be removed like any other." },
  { name: "onFrequentsChange", type: '(frequents, details: { reason: "pick" | "remove" | "clear", emoji?, cancel() }) => void' },
  { name: "skinTone", type: "SkinToneValue", description: "The skin tone: 0 (none) or 1–5, light to dark. Controlled; an uncontrolled one persists to localStorage." },
  { name: "defaultSkinTone", type: "SkinToneValue", default: "0" },
  { name: "onSkinToneChange", type: '(tone: SkinToneValue, details: { reason: "item-press" | "none", event?, cancel() }) => void' },
  { name: "locale", type: "string", default: "the dataset's", description: "BCP 47 tag for search, A–Z order, result counts, and text direction. See Localization." },
  { name: "labels", type: "Partial<EmojiLabels>", default: "defaultLabels", description: "Every string the pickers show or announce. See Localization." },
  { name: "prepare", type: "boolean", default: "true", description: "Loads data and builds the search index when the browser is idle." },
]);
