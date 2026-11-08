import type { Emoji } from "emoji-components";
import { rowsOf } from "./rows";

export const emoji = rowsOf<Emoji.Props>()([
  { name: "emoji", type: "EmojiInput", description: '"🎉", ":tada:", "tada", "1f389", a custom id, a CustomEmoji, an EmojiRecord, or an EmojiSelection.' },
  { name: "size", type: "number", default: "1em", description: "Size in pixels, for images and native text." },
  { name: "renderer", type: '"native" | "image"', default: "the provider's" },
  { name: "animate", type: "boolean", default: "true", description: "Plays an animated custom emoji. Under reduced motion, its stillUrl shows instead." },
  { name: "aria-hidden", type: "boolean", description: "Hides the emoji from assistive technology, with no role or label. Use it next to text that names the emoji." },
]);
