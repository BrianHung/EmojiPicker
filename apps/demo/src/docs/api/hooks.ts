type Rows = [string, string][];

export const pickerHooks: Rows = [
  ["useEmojiPickerSearch()", "`{ query, setQuery, clear, resultCount }`. `resultCount` is `null` while not searching. Used by `SearchStatus`. For your own input, pass it to `SearchInput`'s `render`."],
  ["useEmojiPickerCategories()", "`{ categories, activeCategory, jumpToCategory(id), collapsed, isCollapsed(id), setCollapsed(id, collapsed), toggleCollapsed(id), getItemProps(id, props) }`. Used by `CategoryNav` and `CategoryNavTab`."],
  [
    "useEmojiPickerHighlight()",
    "`{ emoji, highlight(emoji), move(to), pick(emoji?) }`. `emoji` is the highlighted `EmojiRecord`, or `null`. `pick()` picks the highlighted emoji; `pick(emoji)` picks that one. For your own preview or section bar; `actionsRef` gives the same actions outside `Root`.",
  ],
  [
    "useEmojiPickerReactions({ value, defaultValue, onValueChange })",
    "`{ reactions, open, setOpen(open), value, expandable, getItemProps(emoji, props), getExpandProps(props) }`. With a value, the items toggle, as in Base UI's `ToggleGroup`. Used by `Reactions`, `ReactionsItem`, and `ReactionsExpand`.",
  ],
  ["useEmojiPickerGrid({ rowHeight, headerHeight, columns, scrollToIndex })", "`{ rows, stickyIndexes, getGridProps, getHeaderProps, state, variations }`, for your own virtualizer. Used by `List`."],
  ["useEmojiPickerCell(grid.state, item)", "`{ cellProps, state }` for one cell of `useEmojiPickerGrid`. Used by `ListCell`."],
  [
    "emojiPickerInitialFocus(element)",
    "The element to focus when a popover with a picker opens: the field with `autoFocus`, else the list. Base UI: `initialFocus={() => emojiPickerInitialFocus(popup.current)}`. Floating UI: `FloatingFocusManager`'s `initialFocus`. Radix: `onOpenAutoFocus` with `event.preventDefault()` and `emojiPickerInitialFocus(event.currentTarget)?.focus()`.",
  ],
];

export const suggestionsHooks: Rows = [
  [
    "useTextFieldEmojiSuggestions(options, ref)",
    "Shortcode suggestions for an `<input>` or `<textarea>`: `ref`, or the field that spreads `getInputProps({ ref })`. It handles the field's keys. Options: `limit`, `matchBy`, `order`, `columns`, `insertAs`, `onSelect`.",
  ],
  [
    "useEmojiSuggestions({ trigger, element, ...options })",
    "For any editor. `trigger` is `{ query, anchor, replace }`, or `null` while there is no query. `element` is the editor's element, a ref, or a function that returns it; a field that spreads `getInputProps()` needs none.",
  ],
  ["useEmojiSuggestions({ store, anchor, element })", "Around core's `createEmojiSuggestions(store, options)`, for an editor plugin that finds the query itself, such as the ProseMirror item."],
  [
    "Return value",
    "`{ open, query, suggestions, highlightedIndex, anchor, highlight(index), pick(index?), insert(selection), dismiss(), onKeyDown(event), getInputProps(props), getListProps(props), getOptionProps(index, props) }`. `anchor` is the query's box as a Floating UI virtual element: `refs.setPositionReference(anchor)`. `getInputProps` gives the combobox ARIA, the field's ref, and, from `useEmojiSuggestions`, its keys. `onKeyDown` returns `true` when the menu handled the key, for an editor that routes keys through its own commands. Used by the suggestions registry item.",
  ],
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
