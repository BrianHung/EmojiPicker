type Rows = [string, string][];

export const pickerHooks: Rows = [
  ["useEmojiPickerActions()", "`move`, `pick`, `highlight`, `focusSearch`, `clearSearch`, and `toggleSkinTone`, as `actionsRef` gives them."],
  ["useEmojiPickerHighlightedEmoji()", "The highlighted `EmojiRecord`, or `null`."],
  [
    "emojiPickerInitialFocus(element)",
    "The element to focus when a popover with a picker opens: the field with `autoFocus`, else the list. Base UI: `initialFocus={() => emojiPickerInitialFocus(popup.current)}`. Floating UI: `FloatingFocusManager`'s `initialFocus`. Radix: `onOpenAutoFocus` with `event.preventDefault()` and `emojiPickerInitialFocus(event.currentTarget)?.focus()`.",
  ],
  ["useEmojiPickerSearch()", "`{ query, resultCount }`. `resultCount` is `null` while not searching."],
  ["useEmojiPickerCategoryNavigation()", "`{ categories, activeCategory, jumpToCategory(id) }` for your own category tabs."],
  ["useEmojiPickerCollapsedCategories()", "`{ collapsed, isCollapsed(id), toggle(id), setCollapsed(id, collapsed) }`."],
  ["useEmojiPickerGrid({ rowHeight, headerHeight, columns, scrollToIndex })", "In place of `List`: `rows`, `stickyIndexes`, `getGridProps`, `getHeaderProps`, `state`, and `variations`, for your own virtualizer."],
  ["useEmojiPickerCell(grid.state, item)", "`{ cellProps, state }` for one cell of `useEmojiPickerGrid`."],
];

export const suggestionsHooks: Rows = [
  [
    "useTextFieldEmojiSuggestions(ref, options)",
    "Shortcode suggestions for an `<input>` or `<textarea>`. It handles the field's keys. Returns `query`, `open`, `suggestions`, `highlightedIndex`, `anchor`, `getInputProps`, `getListProps`, `getOptionProps`, `choose`, `insert`, `dismiss`, and `onKeyDown`. `anchor` is the query's box as a Floating UI virtual element: `refs.setPositionReference(anchor)`. `getInputProps()` is the field's combobox wiring, which the hook also writes onto the field while the list is open.",
  ],
  ["useEmojiSuggestions({ query, anchor, replace }, options, element)", "Shortcode suggestions for any editor. `element` is the editor's element, a ref to it, or a function that returns it."],
  ["useEmojiSuggestions(suggestions, { anchor })", "The same, around core's `createEmojiSuggestions(store, options)`, for an editor plugin that handles the keys itself, such as the ProseMirror item."],
];

export const suggestionsFunctions: Rows = [
  ["findShortcodeTrigger(textBeforeCaret)", "`{ query, offset }` for a `:query` that ends at the caret, or `null`."],
  ["isComposingKey(event)", "`true` for a key event during IME composition."],
];

export const providerHooks: Rows = [
  ["useEmojiSearch(query, { limit })", "`{ results, pending, error }` from the provider's search, outside a picker; `error` is set when an async search rejects."],
  ["useEmojiFrequents({ limit })", "`{ items, pick, remove, clear }` for the frequently used emoji."],
  ["useEmojiSkinTone()", "`[tone, setTone]` for the shared skin tone."],
  ["useEmojiLabels()", "The provider's `EmojiLabels`."],
  ["useEmojiStore()", "The provider's `EmojiStore`, for `store.select(unified)`, `store.withSkinTone(unified)`, and the rest of core's store API."],
  ["useEmojiStatus()", 'The data status: `"idle"`, `"loading"`, `"ready"`, or `"error"`. Calling it starts loading the data.'],
  ["useCustomEmojiErrors()", "The errors from a `customEmojis` loader that failed; the rest of the data still loads. `useEmojiStore().load()` runs the loader again."],
];

export const providerFunctions: Rows = [
  ["lexicalSearch({ typos, typoThreshold, locale, segmenter, tokenize })", "The default `search`. It ranks names, shortcodes, and tags, and corrects typos."],
  ["localeData(locale, { shortcodes, baseUrl })", 'The URL of a dataset on jsDelivr. `shortcodes: "cldr"` gives shortcodes in the locale\'s language.'],
];

export const emojiHooks: Rows = [["useEmoji(input)", "`{ unified, record, imageUrl, name, native }` for a native emoji, shortcode, unified code, or custom emoji id, or `null`."]];
