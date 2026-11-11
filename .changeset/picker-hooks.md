---
"emoji-components": patch
"@emoji-components/core": patch
---

One set of picker hooks, which the parts are built on; the selection value and the reaction row's open state move into core's `createEmojiPicker`.

Breaking (alpha), old → new:

- `useEmojiPickerActions()` → `useEmojiPickerHighlight()` for `highlight`, `move`, and `pick`, and `useEmojiPickerSearch()` for `setQuery` and `clear`. `actionsRef` is unchanged.
- `useEmojiPickerHighlightedEmoji()` → `useEmojiPickerHighlight().emoji`.
- `useEmojiPickerCategoryNavigation()` and `useEmojiPickerCollapsedCategories()` → `useEmojiPickerCategories()`: `{ categories, activeCategory, jumpToCategory, collapsed, isCollapsed, setCollapsed, toggleCollapsed, getItemProps }`. `toggle(id)` is now `toggleCollapsed(id)`.
- `useEmojiPickerSearch()` returns `setQuery` and `clear` too. `EmojiPickerSearchSummary` → `UseEmojiPickerSearchReturnValue`; `EmojiPickerCategoryNavigation` and `EmojiPickerCollapsedCategories` → `UseEmojiPickerCategoriesReturnValue`.
- New: `useEmojiPickerReactions({ value, defaultValue, onValueChange })`, the hook `Reactions` uses, with `getItemProps` and `getExpandProps`.
- `useEmojiSuggestions(trigger, options, element)` → `useEmojiSuggestions({ trigger, element, ...options })`; `useEmojiSuggestions(store, { anchor }, element)` → `useEmojiSuggestions({ store, anchor, element })`.
- `useTextFieldEmojiSuggestions(ref, options)` → `useTextFieldEmojiSuggestions(options, ref)`. `ref` is optional when the field spreads `getInputProps({ ref })`.
- The `insert` option → `insertAs`. `choose(index)` → `pick(index)`; `setHighlightedIndex(index)` → `highlight(index)`. `textFor` and `activeDescendant` stay on core's store only.
- `getInputProps()` from `useEmojiSuggestions` includes the field's ref and `onKeyDown`, so a plain field needs no `element`.
- Core: `createEmojiPicker` takes `value`, `defaultValue`, `onValueChange`, `onSelect`, `reactionsOpen`, `defaultReactionsOpen`, and `onReactionsOpenChange`, and adds `pick(id, source)` and `setReactionsOpen(open, source)`; the snapshot adds `value` and `reactionsOpen`.
