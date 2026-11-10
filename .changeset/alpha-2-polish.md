---
"emoji-components": patch
"@emoji-components/core": patch
---

- `useTextFieldEmojiTypeahead` no longer throws when a controlled field's value changes under an open menu (picking with Enter or Tab, or deleting).
- Search results hide emoji the system can't draw, as browsing does, and the result count counts only what is shown. `EmojiPickerOptions` takes a `drawable` filter for results.
- Tab into the grid lands on the highlighted emoji: the grid's tab stop follows the highlight.
- Collapsing to the reaction row after a pick clears the search.
- A closing `emoji-components/floating-ui` popover or suggestions popup is `inert`, so focus can't land in it while it animates out.
- The shadcn `emoji-picker` registry cell drops its `hover:` background; the highlight, shared by pointer and keyboard, already shows it.
- `EmojiPicker.Preview` shows the highlighted emoji with its skin tone, and its state adds `unified`; the registry footer uses it.
- `emoji-components` exports the types `EmojiSection`, `EmojiTrigger`, `EmojiSuggestionsStore`, and `SearchResultsMode`.
