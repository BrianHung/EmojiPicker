# Changelog

## Unreleased

The React layer runs on React Aria (`react-aria-components` and its hooks) instead of emoji-picker-react; `emoji-picker-react` is no longer a dependency. The public API (parts, hooks, props, `data-slot` names) is unchanged except as listed here.

### Semantics

- The grid is a `listbox` of `option`s in `group`s (one per section, named by its title), not a `grid` of `gridcell`s. `aria-posinset` and `aria-setsize` count within a section.
- The search field is a `searchbox` (React Aria `Autocomplete`, virtual focus) instead of a `combobox`; it has no `aria-expanded`.
- A tapback's reactions are a `toolbar` of buttons (toggle buttons with `aria-pressed` when `selected` is given), not a `list`.
- Category tabs have no `aria-controls` (they scroll one list rather than switch panels).
- Keys the picker handles stop at `Root` (as React Aria's handled keys do); part and Root `onKeyDown` handlers still see every key first. Escape with nothing to clear or close goes on to the page (a sheet or dialog around the picker closes).
- The search field's clear button is rendered only while there is a query.
- Keyboard moves scroll only the picker's own viewport, never the page.
- With `HeaderActions`, Tab from an emoji goes to the next section's actions (Shift+Tab: its own), as if they were in reading order.
- `EmojiPopover`: Tab out of the content (also from a toolbar inside, which moves focus itself) returns to the page after the trigger and closes.
- `EmojiPopover` (both adapters): a picker with no search field to focus focuses its current emoji once its grid renders; the trigger has `aria-haspopup="dialog"` and `aria-expanded`; the picker fits the space left (`--available-height`) and scrolls inside.

### Added

- Framework-neutral state in `/core`: `createEmojiSuggestions(store, options)` (the `:shortcode` typeahead: `setQuery`, `move`, `highlight`, `choose`, `dismiss`, IME-safe `keydown`, and `getInputProps` / `getListProps` / `getOptionProps` attribute getters) and `createPickerState(store, options)` (query and results, sections from categories, frequents and collapse, highlight, hover, current section, variations, focus model; `moveHighlight` moves through the grid). Both are `subscribe` / `getSnapshot` stores; `useEmojiSuggestions`, `useEmojiSearchState`, Root and the List are thin React wrappers over them, with the same API.
- One `locale` for everything: `createEmojiStore` (and `EmojiProvider`) take `labels` and `collator`; `store.labels()` is the labels for the locale (counts in its digits and plural rules); `localizeLabels(locale, overrides)` builds them. Without `locale`, the dataset's is used for search, collation and counts. Each piece (`labels`, `data`, `search`, `collator`, shortcode sets) replaces only itself.
- `EmojiItem`, `EmojiSection`, `CategoryOption` (with a generic icon type) are exported from `/core`.

- Editor typeahead: `useEmojiTypeahead(trigger, options, element)` turns any editor's `:query` (`query`, `anchor`, `replace`) into one `EmojiTypeahead` (`query`, `open`, `anchor`, `suggestions`, `dismiss`, `onKeyDown`) that any menu renders, and makes the editor a combobox while it is open. Adapters: `useTextFieldEmojiTypeahead` (input and textarea, caret rect from `dom-input-range`, insertion keeps the browser's undo), `@brianhung/emoji-picker/tiptap` (`useTiptapEmojiTypeahead`, on `@tiptap/suggestion`) and `@brianhung/emoji-picker/lexical` (`useLexicalEmojiTypeahead`, on Lexical's typeahead trigger). Tiptap and Lexical are optional peer dependencies. `findShortcodeTrigger(text)`: the `:query` the text before the caret ends with.
- `useEmojiGrid`: the List's grid for a virtualizer you bring (TanStack Virtual, react-window, Virtuoso): `rows`, `stickyIndexes`, prop getters, and `scrollToIndex`. `createEmojiGrid`, `moveInGrid` and `rowsPerPage` (also in `/core`): the rows and the keyboard without React.
- `components.HeaderActions` (`HeaderActionsProps`: `section`, `collapsed`, `toggle`, `toggleProps` with `aria-expanded`): controls for a section title, rendered outside the listbox and pinned with the sticky title.
- `pickerInitialFocus(root)`: where focus belongs when a picker opens in any popover (Base UI, Radix, shadcn/ui).
- `ReactionBar`: a toolbar with a roving tab stop, Home/End and hover continuity, for rows of your own reaction buttons.
- `Tapback reactions`: fixed reactions instead of the user's most-used emoji.
- `Root fitColumns` (default `true`): `false` keeps `columns` per row when the width is a little short.
- `--emoji-list-padding-end`: the grid's end padding without `columns`.
- `List value`, `onLoadMore`, `isLoadingMore`, `loadingMore`: a value picker (`selectionMode="single"`, `aria-selected`), and paging (`onLoadMore` runs as the end of the list nears the viewport).
- `EmojiProvider locale` sets React Aria's locale (`I18nProvider`: direction, number formatting) and formats the default result count; every string in `EmojiLabels` is used (`labels` takes any of them).
- Data attributes on cells and tabs, as React Aria names them: `data-focused`, `data-focus-visible`, `data-hovered`, `data-pressed`, `data-selected`, `data-index`.

### Changed

- Skin-tone variations per emoji (Shift+Space on the highlighted or focused emoji, or a long press) open a row of its six tones over it: a `listbox` (`data-slot="variations"`, options `data-slot="emoji"`) named by `labels.skinTone`, focused on the current tone; Left/Right, Home and End move along it, Enter or Space picks, Escape closes back to the emoji. `Root disableVariations` turns them off.
- The package ships one module per source file: a bundler loads only what you import (`Emoji` alone is ~8 KB gzipped over React; the popover and tapback load only when used).

### Deprecated

- `CategoryHeaderProps.category.toggleCollapsed`: a title is text inside the listbox; put its controls in `components.HeaderActions`.
- `Root colorScheme`: the picker draws no colors of its own. It now only sets `color-scheme` on Root; use `tokens.css` or your own CSS.

### Removed

- Output no longer contains emoji-picker-react markup (`epr-*` classes, `data-epr-*` attributes, `--epr-*` variables). Style `data-slot` and `data-*` attributes; CSS that targeted `[data-epr-part=category-content]` maps to `fitColumns` and `--emoji-list-padding-end`.
