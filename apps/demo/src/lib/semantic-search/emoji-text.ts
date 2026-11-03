// What gets embedded for each emoji, and what each query is prefixed with.

/**
 * name, shortcodes (aliases), tags, then a one-line description when there is one:
 * "thumbs up. +1, thumbsup. good, hand, like, yes"
 */
export const emojiText = (e: { name: string; shortcodes?: readonly string[]; tags?: readonly string[]; description?: string }) =>
  [e.name, (e.shortcodes ?? []).map((s) => s.replace(/_/g, " ")).join(", "), (e.tags ?? []).join(", "), e.description].filter(Boolean).join(". ");

/** BGE v1.5's retrieval instruction. Prepended to short queries, not to the emoji. */
export const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
