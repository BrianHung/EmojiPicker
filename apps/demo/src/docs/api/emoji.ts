import type { Emoji } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const emoji = rowsOf<Emoji.Props>()([
  { name: "emoji", type: "EmojiInput", description: '"🎉", ":tada:", "tada", "1f389", a custom id, a CustomEmoji, an EmojiRecord, or an EmojiSelection.' },
  { name: "size", type: "number", default: "1em", description: "Size in pixels, for images and native text." },
  { name: "renderer", type: '"native" | "image"', default: "the provider's" },
  { name: "animate", type: "boolean", default: "true", description: "Plays an animated custom emoji. Under reduced motion, its stillUrl shows instead." },
  { name: "decorative", type: "boolean", default: "false", description: "Hides the emoji from assistive technology. Use it next to text that names the emoji." },
]);
