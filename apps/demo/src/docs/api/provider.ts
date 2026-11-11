import type { EmojiProvider } from "emoji-components";
import { rowsOf } from "./rows";

export const provider = rowsOf<EmojiProvider.Props>()([
  {
    name: "data",
    type: "Dataset | EmojiDataInput | string | (({ signal }) => Promise<Dataset | EmojiDataInput>)",
    default: '`localeData("en")` on jsDelivr',
    description: "A URL, a loader, or a dataset object.",
  },
  {
    name: "customEmojis",
    type: "CustomEmoji[] | (({ signal }) => Promise<CustomEmoji[]>)",
    description: "Custom emoji, or a loader for them. Each is `{ id, name, imageUrl, shortcodes?, tags?, group?, base?, width?, height?, animated?, stillUrl? }`.",
  },
  { name: "filter", type: "(record: EmojiRecord) => boolean", description: "Removes emoji, custom emoji included, from the pickers and search. Pass a stable function, defined outside the component or memoized." },
  { name: "search", type: "EmojiSearch", default: "`lexicalSearch()`", description: "Ranks the emoji for a query. Pass a stable function, defined outside the component or memoized; a new function runs the current query again." },
  { name: "renderer", type: '"auto" | "native" | "image"', default: '`"auto"`', description: '`"auto"` draws an image wherever the system cannot draw an emoji natively.' },
  {
    name: "imageUrl",
    type: "(unified, { renderer }) => string | undefined",
    default: 'Twemoji when `renderer` is `"image"`',
    description: "The image URL for an emoji; `undefined` draws it natively. A URL under the native renderer replaces that emoji.",
  },
  { name: "imageVersion", type: "number", default: "`17`", description: "The newest Unicode emoji version your images draw." },
  { name: "frequents", type: "Record<unified, { count, lastUsed }>", description: "Frequently used emoji. `count` halves every 14 days. Controlled; uncontrolled frequents persist to `localStorage`." },
  { name: "defaultFrequents", type: "Record<unified, { count, lastUsed }>", default: "👍 ❤️ 😂 🎉 🙏 🔥", description: "Used while `localStorage` holds none. They can be removed like any other." },
  { name: "onFrequentsChange", type: '(frequents, details: { reason: "pick" | "remove" | "clear", emoji?, cancel() }) => void' },
  { name: "skinTone", type: "SkinToneValue", description: "`0` (none) or `1` to `5`, light to dark. Controlled; an uncontrolled tone persists to `localStorage`." },
  { name: "defaultSkinTone", type: "SkinToneValue", default: "`0`" },
  { name: "onSkinToneChange", type: '(tone: SkinToneValue, details: { reason: "item-press" | "none", event, cancel() }) => void' },
  { name: "locale", type: "string", default: "the dataset's", description: "A BCP 47 tag for search, A–Z order, result counts, and text direction." },
  { name: "labels", type: "Partial<EmojiLabels>", default: "English", description: "Every string the pickers show or announce." },
  { name: "prepare", type: "boolean", default: "`true`", description: "Loads the data and builds the search index while the browser is idle." },
]);
