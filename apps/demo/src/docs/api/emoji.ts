import type { EmojiProps } from "@brianhung/emoji-picker";
import { rowsOf } from "./rows";

export const emoji = rowsOf<EmojiProps>()([
  { name: "emoji", type: "EmojiInput", description: '"🎉", ":tada:", "tada", "1f389", a custom id, a CustomEmoji, an EmojiRecord or an EmojiSelection.' },
  { name: "size", type: "number", description: "Image size in pixels; native text follows font-size." },
  { name: "renderer", type: '"native" | "twemoji"', default: "the provider's" },
  { name: "animate", type: "boolean", default: "true", description: "Plays an animated custom emoji; never with reduced motion." },
  { name: "decorative", type: "boolean", default: "false", description: "Hidden from assistive technology (next to text that names it)." },
]);
