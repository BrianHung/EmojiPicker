import type { PropRow } from "@/components/site/docs";

export const provider: PropRow[] = [
  { name: "data", type: "Dataset | string | (({ signal }) => Promise<Dataset>)", description: "A URL, a loader or a dataset object." },
  { name: "customEmojis", type: "CustomEmoji[]", description: "{ id, name, imageUrl, shortcodes?, tags?, group? }" },
  { name: "filter", type: "(record: EmojiRecord) => boolean", description: "Excludes emoji from the picker and search." },
  { name: "search", type: "EmojiSearch", default: "lexical()", description: "(query, context) => hits | Promise<hits>" },
  { name: "renderer", type: '"auto" | "native" | "twemoji"', default: '"auto"' },
  { name: "twemojiBaseUrl", type: "string", default: "jsDelivr (pinned)" },
  { name: "frequents", type: "FrequencyStore", default: "localStorage", description: "createFrequencyStore({ storage })" },
  { name: "defaultSkinTone", type: "number", default: "0", description: "1–5 are the Fitzpatrick tones." },
  { name: "prepare", type: "boolean", default: "true", description: "Loads data and builds the index when idle." },
  { name: "labels", type: "{ suggested?: string; custom?: string }", default: '"Frequently used", "Custom"' },
];
