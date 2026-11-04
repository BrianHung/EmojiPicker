# Keyboard and accessibility audit

Emoji pickers in Linear, Discord, Slack and Instagram (web, Chrome, November 2026), measured from the DOM and by pressing keys from the search field. Notion was signed out and is not covered. Apple's pickers (macOS Character Viewer, iOS keyboard) are native and not covered.

## Structure

| | Linear | Discord | Slack | Instagram |
|---|---|---|---|---|
| Container | none | `dialog` | none | `dialog`, unlabelled |
| Search field | placeholder only | `combobox`, `aria-controls` → grid, `aria-expanded` | `aria-label="Emoji name"` | placeholder only |
| Highlight exposed to assistive tech | no | `aria-activedescendant` | DOM focus on the cell | no keyboard highlight |
| Grid | none | `grid` › `rowgroup` › `row` › `gridcell` | one `grid` per section, `columnheader` titles | none |
| Cell name | shortcode (“+1”) | shortcodes (“:thumbsup: :+1:”) | phrase (“heart emoji”) | none for the grid |
| Category navigation | — | buttons | `tablist` / `tab` | — |
| Live region | none | polite and assertive | none | — |

## Keys from the search field

| Key | Linear | Discord | Slack | Instagram |
|---|---|---|---|---|
| Arrows | move a visual highlight from the first emoji | move the highlight; continue from the hovered emoji | move DOM focus into the grid | move the text caret |
| Home / End | — | end of row | end of row | — |
| Page Up / Down | — | — | — | — |
| Tab | stays in search | stays in search | next section’s grid | — |
| Escape | closes; focus is not returned to the trigger | closes; focus returns to the trigger | closes; focus returns to the trigger | closes; focus returns to the trigger |
| Hover | separate from the keyboard highlight | sets the highlight | separate | — |

The Instagram reaction bar is a `dialog` of buttons named by their emoji character; Tab moves between them, arrows do nothing.

## Findings

- Discord is the most complete: a labelled combobox driving a grid through `aria-activedescendant`, live regions, and focus returned on close.
- Linear’s highlight is invisible to screen readers: no roles, no `aria-activedescendant`, no live region, and focus is not returned on close.
- Slack exposes structure well (tabs, per-section grids, descriptive names) but moves focus out of the search field, has no combobox semantics, and announces no result count.
- No app supports Page Up / Page Down; none lets users remap keys.

## @brianhung/emoji-picker

Defaults follow Discord; the rest is configurable. Each row is checked in Chrome by `npm run test:e2e` and `npm run test:a11y` in `packages/emoji-picker`, and on every demo surface (gallery, home page, examples) by the keyboard audit script.

| | With a search field | Without a search field |
|---|---|---|
| Structure | search field is a `searchbox` (React Aria `Autocomplete`) with `aria-controls` and `aria-activedescendant`; the list is a `listbox` › `group` (one per section, named by its title) › `option`; names include the skin tone (“thumbs up: medium skin tone”); results have a polite live region (“24 results”) | the same listbox |
| On open | focus in the search field (inline: once clicked; popover: on open), and it stays there | focus on the first emoji (or the one that was focused last) |
| Arrows, Page Up / Down | move a highlight through the grid or results (`aria-activedescendant`); Left / Right edit the query unless the caret is at its end | move focus cell to cell (roving tabindex) |
| Home / End | first / last emoji while the field is empty; with a query they move the caret, and Ctrl+Home / Ctrl+End move the highlight | first / last emoji |
| Hover (`pointer="follows"`) | moves the highlight; the next arrow continues from the hovered emoji; focus never moves | the next arrow continues from the hovered emoji (focus follows the pointer once it is in the grid; hover never takes focus from outside the picker and never scrolls the page). `"independent"`: hover is only a style |
| Enter / Space | Enter picks the highlighted emoji (Space types a space) | Enter or Space picks |
| After a pick | focus and highlight stay when the picker stays open; a popover closes and focus returns to the trigger | same |
| Escape | clears the query, then ends the highlight, then closes the popover; focus returns to the trigger | closes the popover; focus returns to the trigger |
| Tab | leaves: the grid is one tab stop, the category tabs are one tab stop; past the end of a popover, focus goes to what follows the trigger and the popover closes | same |
| Category tabs | arrows move between tabs; Enter, Space or a click scrolls the list (at once from the keyboard), never the page | same |
| Skin tone | Enter or Space opens the tones with the current one focused; arrows, Home and End move; Enter or Space chooses; Escape closes; focus returns to the button either way, and the Escape goes no further (an enclosing sheet stays open) | same |
| Tapback row (`toolbar`) | one tab stop; Left / Right / Home / End move between reactions; the next arrow continues from a hovered reaction; Enter or Space picks; “+” expands into the full picker with focus in its search field | same |
| Focus model | `focusModel="input"` (default) keeps focus in search; `"grid"` moves it into the cells | same |
| Customisation | `keymap` remaps actions; a part’s `onKeyDown` runs first and can call `event.preventEmojiPickerHandler()` | same |

The picker was a `combobox` driving a `grid` › `row` › `gridcell` until it moved to React Aria Components. It now follows React Aria's Autocomplete pattern: a `searchbox` whose `aria-activedescendant` names an `option` in a `listbox` of `group`s. Keys, focus and hover behave as above in both.
