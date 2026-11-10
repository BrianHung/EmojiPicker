---
"emoji-components": patch
---

The package ships emoji parts and hooks; popovers, positioned menus, and toolbars outside a picker move to the shadcn/ui registry.

Breaking (alpha), old → new:

- `EmojiPopover` (`emoji-components/floating-ui`, `/react-aria`, `/popover/*`) → your popover, or the `emoji-picker-popover` (shadcn/ui), `emoji-picker-popover-react-aria`, or `emoji-picker-popover-floating-ui` registry item. Close it in `onSelect`, pass `emojiPickerInitialFocus(popup)` as its initial focus, and give the field `autoFocus`; `SearchInput` no longer focuses itself inside a popover. Escape with nothing to clear goes on to the popover.
- `EmojiSuggestions.Root`, `.Portal`, `.Positioner`, `.Popup` (`/suggestions/*`) → the `emoji-suggestions` registry item on Floating UI. `anchor` from `useEmojiSuggestions` is a Floating UI virtual element, `{ getBoundingClientRect(), contextElement }`, in place of a function: `refs.setPositionReference(anchor)`. New: `getInputProps()`, the field's combobox props; `getListProps()` keeps focus in the field on mousedown. `EmojiSuggestionsSide`, `EmojiSuggestionsAlign`, `EmojiSuggestionsAnchor`, and `EmojiSuggestionsContainer` are gone; `EmojiSuggestionsAnchor` now names the virtual element.
- `EmojiReactionBar` (`emoji-components`, `/reaction-bar`) → the `emoji-reaction-bar` registry item, on React Aria's `useToolbar`.
- `EmojiPicker.SearchInputGroup` → `EmojiPicker.Search`, which is now React Aria's `SearchField`: `<Search><SearchInput /><SearchClear /></Search>`. Put a skin tone or other buttons beside `Search`, not inside it.
- `EmojiPickerRootActions.close()` is gone; close the popover yourself.
- `Viewport` with no children renders `List`.
