export const emojiText = (e: { name: string; shortcodes?: readonly string[]; tags?: readonly string[]; description?: string }) =>
  [e.name, (e.shortcodes ?? []).map((s) => s.replace(/_/g, " ")).join(", "), (e.tags ?? []).join(", "), e.description].filter(Boolean).join(". ");

export const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
