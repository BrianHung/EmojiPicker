# emoji-components

## 1.0.0-alpha.2

### Patch Changes

- 5cf7817: Fixes from the code review.
  - Breaking (alpha): `store.packErrors()` is now `store.customEmojiErrors()`; `store.load()` runs a failed `customEmojis` loader again, and `useCustomEmojiErrors()` reads the errors.
  - A rejected async search sets `error` on `EmojiSearchState`, and the list's empty state reports it as `status: "error"` with a `retry()` that searches again.
  - `EmojiPicker.Root` renders a `<div role="group">` instead of an `<aside>` landmark.
  - Shift+Tab no longer chooses a suggestion.
  - `useTextFieldEmojiTypeahead` suggests only while its field is focused.
  - `keyboardTarget` binds a ref that attaches after Root mounts.
  - An outside press calls the skin tone's and variations' `onOpenChange` once.
  - Data fetches abort with the store's signal.
- c9e857c: Fixes from developer testing and review.
  - `useTextFieldEmojiTypeahead` no longer throws when a controlled field's value changes under an open menu (picking with Enter or Tab, or deleting).
  - Search results hide emoji the system can't draw, as browsing does, and the result count counts only what is shown. `EmojiPickerOptions` takes a `drawable` filter for results.
  - Tab into the grid lands on the highlighted emoji: the grid's tab stop follows the highlight.
  - Collapsing to the reaction row after a pick clears the search.
  - A closing `emoji-components/floating-ui` popover or suggestions popup is `inert`, so focus can't land in it while it animates out.
  - The shadcn `emoji-picker` registry cell drops its `hover:` background; the highlight, shared by pointer and keyboard, already shows it.
  - `EmojiPicker.Preview` shows the highlighted emoji with its skin tone, and its state adds `unified`; the registry footer uses it.
  - `emoji-components` exports the types `EmojiSection`, `EmojiTrigger`, `EmojiSuggestionsStore`, and `SearchResultsMode`.
  - The suggestions menu leaves modified keys to the field: Cmd/Ctrl+Enter, Alt combinations, and Shift with the arrows. `KeyLike` takes `metaKey`, `ctrlKey`, and `altKey`.
  - Search results with a skin tone are checked for drawing in that tone.
  - Focus leaving the picker from the search field clears the highlight, as leaving the grid does.
  - A failed search or data load announces no result count. The registry's empty state tells a data failure from a search failure.
  - The Tiptap registry hook no longer warns about `useLayoutEffect` when rendered on the server with React 18.
- b245ab8: Every README snippet is a complete file you can paste, and the READMEs note the prerelease.
- Updated dependencies [5cf7817]
- Updated dependencies [c9e857c]
- Updated dependencies [b245ab8]
  - @emoji-components/core@1.0.0-alpha.2

## 1.0.0-alpha.1

### Major Changes

- f328e76: Initial release. Unstyled, composable emoji components for React, with Base UI's API shape on React Aria's behavior.
  - `EmojiPicker`: a virtualized picker with search, category navigation, skin tones, a reaction row, and a preview.
  - `EmojiPopover` (from `/floating-ui` or `/react-aria`) and `EmojiSuggestions`, a shortcode typeahead at the caret.
  - `Emoji` and `EmojiProvider`, which holds data, search, locale, frequently used emoji, and skin tone.
  - Copy-in components in the shadcn registry.
  - ESM-only, for React 18.2 and 19; parts render from Server Components.

  Docs: https://emoji.brianhung.me

### Patch Changes

- Updated dependencies [f328e76]
  - @emoji-components/core@1.0.0-alpha.1
