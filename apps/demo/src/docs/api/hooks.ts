export const hooks: [string, string][] = [
  ["useTextFieldEmojiTypeahead(ref, options)", "Shortcode typeahead for an <input> or <textarea>. Returns an EmojiTypeahead: query, open, anchor, suggestions, dismiss, and onKeyDown."],
  [
    "useEmojiTypeahead({ query, anchor, replace }, options, element)",
    "Shortcode typeahead for any editor. findShortcodeTrigger(textBeforeCaret) finds the query. element is the editor's element, a ref to it, or a function that returns it.",
  ],
  ["useEmojiTypeahead(suggestions, { anchor })", "The same, around core's createEmojiSuggestions(store, options) for an editor plugin that owns the keys, such as ProseMirror."],
  ["useEmojiSearch(query, { limit })", "{ results, pending } from the provider's search, outside a picker."],
  ["useFrequentEmoji({ limit })", "{ items, pick, remove, clear } for the frequently used emoji."],
  ["useSkinTone()", "[tone, setTone] for the shared skin tone."],
  ["useEmoji(input)", "Resolves a native emoji, shortcode, unified code, or custom emoji id, or returns null."],
  ["useEmojiLabels()", "The provider's EmojiLabels."],
  ["useEmojiStore()", "The provider's EmojiStore, for store.select(unified), store.withSkinTone(unified), and the rest of core's store API."],
  ["useEmojiStatus()", 'The data status: "idle", "loading", "ready", or "error". It starts loading the data.'],
  ["useEmojiPickerActions()", "Inside Root: move, pick, highlight, focusSearch, clearSearch, close, and toggleSkinTone."],
  ["useActiveEmoji(), useSearchState(), useCategoryNavigation(), useCollapsedCategories()", "Inside Root: the highlighted emoji, the query and result count, the category tabs, and the collapsed sections."],
];
