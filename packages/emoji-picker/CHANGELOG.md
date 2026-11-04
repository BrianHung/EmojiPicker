# Changelog

## Unreleased

The React layer runs on React Aria Components and Floating UI instead of emoji-picker-react; `emoji-picker-react` is no longer a dependency. The public API (parts, hooks, props, `data-slot` names) is unchanged except as listed here.

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

### Added

- `components.HeaderActions` (`HeaderActionsProps`: `section`, `collapsed`, `toggle`, `toggleProps` with `aria-expanded` and `aria-controls`): controls for a section title, rendered outside the listbox and pinned with the sticky title.
- `pickerInitialFocus(root)`: where focus belongs when a picker opens in any popover (Base UI, Radix, shadcn/ui).
- `ReactionBar`: a toolbar with a roving tab stop, Home/End and hover continuity, for rows of your own reaction buttons.
- `Tapback reactions`: fixed reactions instead of the user's most-used emoji.
- `Root fitColumns` (default `true`): `false` keeps `columns` per row when the width is a little short.
- `--emoji-list-padding-end`: the grid's end padding without `columns`.
- `List value`, `onLoadMore`, `isLoadingMore`, `loadingMore`: a value picker (`selectionMode="single"`, `aria-selected`), and paging through React Aria's `ListBoxLoadMoreItem`.
- `EmojiProvider locale` sets React Aria's locale (`I18nProvider`: direction, number formatting) and formats the default result count; every string in `EmojiLabels` is used (`labels` takes any of them).
- Data attributes from React Aria on cells and tabs: `data-focused`, `data-focus-visible`, `data-hovered`, `data-pressed`, `data-selected`, `data-index`.

### Deprecated

- `CategoryHeaderProps.category.toggleCollapsed`: a title is text inside the listbox; put its controls in `components.HeaderActions`.
- `Root colorScheme`: the picker draws no colors of its own. It now only sets `color-scheme` on Root; use `tokens.css` or your own CSS.
- `Root disableVariations`: has no effect. Skin-tone variations per emoji (Shift+Space, long press) aren't available in this version; the shared `SkinTone` applies to every emoji.

### Removed

- Output no longer contains emoji-picker-react markup (`epr-*` classes, `data-epr-*` attributes, `--epr-*` variables). Style `data-slot` and `data-*` attributes; CSS that targeted `[data-epr-part=category-content]` maps to `fitColumns` and `--emoji-list-padding-end`.
