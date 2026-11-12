---
"emoji-components": patch
"@emoji-components/core": patch
---

The public API follows Base UI's and shadcn/ui's conventions.

Breaking (alpha), old → new:

- `EmojiPicker.SearchField` → `EmojiPicker.SearchInputGroup` (`data-slot="emoji-picker-search-input-group"`, `EmojiPickerSearchInputGroupDataAttributes`). `SearchInput` renders only the `<input>`: it takes no children, adds no clear button, and must be inside a `SearchInputGroup`, with `SearchClear` beside it. `<EmojiPicker.Search />` with no children renders the group, the input, and the clear button.
- `useEmojiTypeahead` → `useEmojiSuggestions`, `useTextFieldEmojiTypeahead` → `useTextFieldEmojiSuggestions`, `EmojiTypeaheadOptions` → `UseEmojiSuggestionsOptions`, `EmojiTypeahead` → `UseEmojiSuggestionsReturnValue`. The return value is flat: `suggestions.suggestions` → `suggestions`, `suggestions.getListProps()` → `getListProps()`, and the duplicated top-level `dismiss` and `onKeyDown` are gone. `getListProps()` sets `aria-label` from the new `labels.suggestions`.
- `EmojiSuggestions.Positioner`'s types: `EmojiSuggestionsSide`, `EmojiSuggestionsAlign`, `EmojiSuggestionsAnchor`, and `EmojiSuggestionsContainer` in place of the `EmojiPopover*` names.
- `EmojiPopover.Root` from `/react-aria` is non-modal by default, as from `/floating-ui` and in Base UI; pass `modal` for the old behavior.
- A selection in `Panel` shows the reaction row again with reason `"item-press"`; `details.cancel()` in `onSelect` or `onReactionsOpenChange` keeps the picker open. `details.collapse()` is gone, and `EmojiPicker.Root.SelectEventDetails` → `EmojiPicker.Root.ChangeEventDetails`.
- Frequently used emoji have one name: section id `"suggested"` → `"frequent"`, `labels.suggested` → `labels.frequent`, Root's `suggested={[…]}` → `frequent={[…]}` (`frequent` takes a count, `false`, or a fixed list, as `reactions` does), `useFrequentEmoji` → `useEmojiFrequents`, `FrequentEmoji` → `UseEmojiFrequentsReturnValue`.
- `useEmojiPickerActiveEmoji` → `useEmojiPickerHighlightedEmoji`; `EmojiPickerCategoryIcon` → `EmojiPicker.CategoryNavIcon`, whose `category` defaults to its tab's.
- `EmojiPicker.CategoryNavTab`'s state drops `selected`; `active` (`data-active`) marks the section in view, as in Base UI's Tabs.
- `EmojiPicker.SkinTone.ChangeEventDetails` → `.OpenChangeEventDetails`, `.ChangeEventReason` → `.OpenChangeEventReason` (`EmojiPickerSkinToneOpenChangeEventDetails`).
- `EmojiPickerRootCssVariables.contentWidth` → `EmojiPickerListCssVariables.contentWidth`.
- `UseEmojiPickerGridResult` → `UseEmojiPickerGridReturnValue`, `UseEmojiPickerCellResult` → `UseEmojiPickerCellReturnValue`.
- Core: `createSearch` → `createEmojiSearch`, which returns the newly exported `EmojiSearchStore`.
- A part's own `data-slot` wins over one passed in props.
- shadcn registry: `emoji-picker` exports one component per part, as shadcn/ui's own components do: `EmojiPicker`, `EmojiPickerSearch`, `EmojiPickerSkinTone`, `EmojiPickerContent`, `EmojiPickerCell`, `EmojiPickerEmpty`, `EmojiPickerFooter`, `EmojiPickerReactions`, and `EmojiPickerPanel`. `EmojiPickerCard` → `<EmojiPicker><EmojiPickerSearch /><EmojiPickerContent /><EmojiPickerFooter /></EmojiPicker>` (`cell` → a function child of `EmojiPickerContent`, `empty` → `renderEmptyState`, `footer={false}` → leave out `EmojiPickerFooter`); `EmojiTapback` → `<EmojiPicker reactions={5}><EmojiPickerReactions /><EmojiPickerPanel>…</EmojiPickerPanel></EmojiPicker>`; `EmojiPickerBody` is gone. `EmojiPickerPopover` takes `open`, `defaultOpen`, and `onOpenChange`, passes the rest to the picker, and takes the popover's own `side` and `align` (`placement` with `--base aria`). `useTiptapEmojiTypeahead` → `useTiptapEmojiSuggestions`, `useLexicalEmojiTypeahead` → `useLexicalEmojiSuggestions`, `EmojiSuggestionMenu` → `EmojiSuggestionsMenu` (`components/tiptap/emoji-suggestions-menu.tsx`), `EmojiTypeaheadPlugin` → `EmojiSuggestionsPlugin` (`components/lexical/emoji-suggestions-plugin.tsx`), `emojiTypeahead` → `emojiSuggestions` in `emoji-prosemirror`.

New: `EmojiReactionBar` (also from `emoji-components/reaction-bar`), the toolbar behind `EmojiPicker.Reactions`, for reaction buttons outside a picker; the `emoji-reaction-bar` item wraps it.
