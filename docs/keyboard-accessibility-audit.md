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

## @brianhung/emoji-picker (target, verified before release)

Defaults follow Discord; the rest is configurable.

| | Behaviour |
|---|---|
| Search field | `combobox` with `aria-controls`, `aria-expanded`, `aria-activedescendant` |
| Grid | `grid` › `row` › `gridcell`; names include the skin tone |
| Results | polite live region (“24 results”) |
| Arrows, Home / End, Page Up / Down | move the highlight; Left / Right edit text unless the caret is at an edge |
| Hover | sets the highlight (`pointer="follows"`), or stays separate (`"independent"`) |
| Focus | stays in search (`focusModel="input"`), or moves into the grid (`"grid"`) |
| After a pick | focus and highlight stay when the picker stays open |
| Escape | closes; focus returns to the trigger |
| Customisation | `keymap` remaps actions; `onKeyDown` runs first and can call `preventDefaultHandler()` |
