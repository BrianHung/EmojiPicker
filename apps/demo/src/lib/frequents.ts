import type { EmojiProvider } from "emoji-components";

// The site's starter row, until a visitor picks their own
export const siteFrequents: EmojiProvider.Props["defaultFrequents"] = Object.fromEntries(["1f44d", "2764-fe0f", "1f602", "1f389", "1f64f", "1f525"].map((unified, i) => [unified, { count: 0, lastUsed: -i }]));
