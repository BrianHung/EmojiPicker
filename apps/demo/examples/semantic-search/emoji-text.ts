// What gets embedded for each emoji, and what each query is prefixed with.
// BGE v1.5 retrieves better when short queries carry its retrieval instruction.

/** name + shortcodes + tags: "thumbs up. +1, thumbsup. good, hand, like, yes" */
export const emojiText = (e: { name: string; shortcodes: readonly string[]; tags: readonly string[] }) =>
  `${e.name}. ${e.shortcodes.map((s) => s.replace(/_/g, " ")).join(", ")}. ${e.tags.join(", ")}`;

export const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
