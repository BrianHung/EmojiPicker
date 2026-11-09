import type { Emoji } from "emoji-components";
import { rowsOf } from "./rows";

export const emoji = rowsOf<Emoji.Props>()([
  {
    name: "emoji",
    type: "EmojiInput",
    description: '`"🎉"`, `":tada:"`, `"tada"`, `"1f389"`, a custom emoji id, a `CustomEmoji`, an `EmojiRecord`, or an `EmojiSelection`.',
  },
  { name: "size", type: "number", default: "`1em`", description: "Size in pixels, for images and native text." },
  { name: "renderer", type: '"native" | "image"', default: "the provider's" },
  { name: "animate", type: "boolean", default: "`true`", description: "Plays an animated custom emoji. Under reduced motion, its `stillUrl` shows instead." },
  { name: "aria-hidden", type: "boolean", description: "Hides the emoji from assistive technology, with no role or label. Use it next to text that names the emoji." },
]);

export const selection: [string, string][] = [
  ["emoji", 'The native emoji with its skin tone, such as `"👍🏽"`, or `""` for a custom emoji.'],
  ["unified", 'The code points with the skin tone, such as `"1f44d-1f3fd"`, or a custom emoji\'s id.'],
  ["baseUnified", "The code points without the skin tone."],
  ["name", "The emoji's name in the dataset's locale."],
  ["shortcode", 'The first shortcode with the skin tone, such as `":+1::skin-tone-4:"`.'],
  ["shortcodes", "Every shortcode, without colons."],
  ["skinTone", "`0` to `5`."],
  ["isCustom", "`true` for a custom emoji."],
  ["imageUrl", "A custom emoji's image."],
];
