# emoji-components

## 1.0.0-alpha.3

### Patch Changes

- fc68d9f: The public API follows Base UI's and shadcn/ui's conventions.
  
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
- e9c5339: The package ships emoji parts and hooks; popovers, positioned menus, and toolbars outside a picker move to the shadcn/ui registry.
  
  Breaking (alpha), old → new:
  
  - `EmojiPopover` (`emoji-components/floating-ui`, `/react-aria`, `/popover/*`) → your popover, or the `emoji-picker-popover` (shadcn/ui), `emoji-picker-popover-react-aria`, or `emoji-picker-popover-floating-ui` registry item. Close it in `onSelect`, pass `emojiPickerInitialFocus(popup)` as its initial focus, and give the field `autoFocus`; `SearchInput` no longer focuses itself inside a popover. Escape with nothing to clear goes on to the popover.
  - `EmojiSuggestions.Root`, `.Portal`, `.Positioner`, `.Popup` (`/suggestions/*`) → the `emoji-suggestions` registry item on Floating UI. `anchor` from `useEmojiSuggestions` is a Floating UI virtual element, `{ getBoundingClientRect(), contextElement }`, in place of a function: `refs.setPositionReference(anchor)`. New: `getInputProps()`, the field's combobox props; `getListProps()` keeps focus in the field on mousedown. `EmojiSuggestionsSide`, `EmojiSuggestionsAlign`, and `EmojiSuggestionsContainer` are gone, and `EmojiSuggestionsAnchor` is now the virtual element's type.
  - `EmojiReactionBar` (`emoji-components`, `/reaction-bar`) → the `emoji-reaction-bar` registry item, on React Aria's `useToolbar`.
  - `EmojiPicker.SearchInputGroup` → `EmojiPicker.Search`, which is now React Aria's `SearchField`: `<Search><SearchInput /><SearchClear /></Search>`. Put a skin tone or other buttons beside `Search`, not inside it.
  - `EmojiPickerRootActions.close()` is gone; close the popover yourself.
  - `Viewport` with no children renders `List`.
- 46d6f30: One set of picker hooks, which the parts are built on; the selection value and the reaction row's open state move into core's `createEmojiPicker`.
  
  Breaking (alpha), old → new:
  
  - `useEmojiPickerActions()` → `useEmojiPickerHighlight()` for `highlight`, `move`, and `pick`, and `useEmojiPickerSearch()` for `setQuery` and `clear`. `pick(emoji?)` on both and on `actionsRef` picks the given emoji, or the highlighted one without it.
  - `useEmojiPickerHighlightedEmoji()` → `useEmojiPickerHighlight().emoji`.
  - `useEmojiPickerCategoryNavigation()` and `useEmojiPickerCollapsedCategories()` → `useEmojiPickerCategories()`: `{ categories, activeCategory, jumpToCategory, collapsed, isCollapsed, setCollapsed, toggleCollapsed, getItemProps }`. `toggle(id)` is now `toggleCollapsed(id)`.
  - `useEmojiPickerSearch()` returns `setQuery` and `clear` too. `EmojiPickerSearchSummary` → `UseEmojiPickerSearchReturnValue`; `EmojiPickerCategoryNavigation` and `EmojiPickerCollapsedCategories` → `UseEmojiPickerCategoriesReturnValue`.
  - New: `useEmojiPickerReactions({ value, defaultValue, onValueChange })`, the hook `Reactions` uses, with `getItemProps` and `getExpandProps`.
  - `useEmojiSuggestions(trigger, options, element)` → `useEmojiSuggestions({ trigger, element, ...options })`; `useEmojiSuggestions(store, { anchor }, element)` → `useEmojiSuggestions({ store, anchor, element })`.
  - `useTextFieldEmojiSuggestions(ref, options)` → `useTextFieldEmojiSuggestions(options, ref)`. `ref` is optional when the field spreads `getInputProps({ ref })`.
  - The `insert` option → `insertAs`. `choose(index)` → `pick(index)`; `setHighlightedIndex(index)` → `highlight(index)`. `textFor` and `activeDescendant` stay on core's store only.
  - `getInputProps()` from `useEmojiSuggestions` includes the field's ref and `onKeyDown`, so a plain field needs no `element`.
  - Core: `createEmojiPicker` takes `value`, `defaultValue`, `onValueChange`, `onSelect`, `reactionsOpen`, `defaultReactionsOpen`, and `onReactionsOpenChange`, and adds `pick(id, source)` and `setReactionsOpen(open, source)`; the snapshot adds `value` and `reactionsOpen`.
- e56f95d: Fixes from first-install testing.
  
  - Search ranks exact word matches above partial ones, shortcode completions break ties by use, and hiragana finds katakana words.
  - A text field suggestion adds a space only when whitespace doesn't already follow.
  - `hold()` freezes only a reaction row drawn from frequently used emoji; an explicit `reactions` array always shows.
  - A pick that collapses `Panel` returns focus to `ReactionsExpand`. The reaction row renders from its codes before the data loads.
  - `useEmojiPickerHighlight()` returns `unified`, the highlighted code with its skin tone.
  - `@emoji-components/data` builds in `prepack` instead of `prepare`.
  - A cell may draw outside its box, such as a highlight or focus ring that extends past the cell, instead of being clipped.
  - `localeData` resolves a BCP 47 tag to the nearest dataset folder (`en-US` → `en`, `zh-TW` → `zh-hant`, `es-419` → `es-mx`), including with `baseUrl`.
  - Without `data`, `EmojiProvider` loads the dataset for its `locale` instead of English.
  - Frequently used starts empty; pass `defaultFrequents` to seed it. A `reactions={n}` row with no history shows `Panel` in its place. The Twemoji font's first subset no longer includes starter emoji.
  - The default `previewCaption` is "Pick an emoji".
  - A localized dataset names Smileys & People from both of its emojibase groups, such as "スマイリーと感情、人と体".
  - `useEmojiPickerReactions()` returns `getToolbarProps(props)`, the toolbar `Reactions` uses: role, label, and arrow, Home, and End focus. `getExpandProps` types `aria-expanded` as `boolean`.
  - The reaction row server-renders `ReactionsExpand` when a `Panel` is there.
- Updated dependencies [fc68d9f]
- Updated dependencies [46d6f30]
- Updated dependencies [e56f95d]
  - @emoji-components/core@1.0.0-alpha.3

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
