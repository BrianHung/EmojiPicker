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

export const rendering: [string, string, string][] = [
  ["System font", "`tokens.css` sets `--emoji-font-family`", 'The default. `renderer="auto"` draws an image wherever the font can\'t.'],
  ["Twemoji font", '`@import "@emoji-components/twemoji-font/twemoji.css"` and `--emoji-font-family: Twemoji`', "Subsets load as they are drawn. Twemoji is CC-BY 4.0, so credit it."],
  ["Any font", '`--emoji-font-family: "Noto Color Emoji"`', "Any color emoji font, such as one from Google Fonts."],
  ["Images", '`<EmojiProvider renderer="image">`', "Twemoji images from jsDelivr."],
  ["Custom art", "`<EmojiProvider imageUrl={(unified) => art[unified]}>`", "`undefined` keeps the default for the other emoji."],
  ["Custom emoji", "`<EmojiProvider customEmojis={[{ id, name, imageUrl }]}>`", "Image emoji with shortcodes, in their own sections."],
];
