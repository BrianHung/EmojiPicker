export const slots: [string, string][] = [
  ['data-slot="emoji-picker"', "Root"],
  ['data-slot="emoji-picker-search" · "emoji-picker-search-input" · "emoji-picker-search-clear"', "Search row, its input and clear button"],
  ['data-slot="emoji-picker-category-nav" · "emoji-picker-category-tab"', "Category bar and each tab"],
  ['data-slot="emoji-picker-viewport" · "emoji-picker-list"', "Scroll container and the virtualized list"],
  ['data-slot="emoji-picker-section-title" · "emoji-picker-emoji"', "Section titles and cells"],
  ['data-slot="emoji-picker-skin-tone" · "emoji-picker-skin-tone-trigger" · "emoji-picker-skin-tone-options" · "emoji-picker-skin-tone-option"', "Skin tone, its trigger, the options and each option"],
  ['data-slot="emoji-picker-reactions" · "emoji-picker-reactions-expand" · "emoji-picker-panel"', "Tapback row, its “+”, and the expanded picker"],
  ['data-slot="emoji-picker-preview"', "Preview"],
];

export const stateAttributes: [string, string][] = [
  ["data-searching", "Root, Viewport and List while search results show."],
  ["data-highlighted", "Present on the highlighted cell while focus stays in a search field or keyboard target."],
  ["data-active", "Present on the category tab for the section in view, as on Base UI's Tabs.Tab."],
  ["data-selected", "A value picker's cell; the current skin-tone option; a selected reaction."],
  ["data-collapsed", "A collapsed section, its title and its actions."],
  ["data-disabled", "CategoryNav and its tabs while search results show."],
  ["data-empty", "Search with no query; List with nothing to show."],
  ["data-has-variations", "Present on cells with skin-tone variations."],
  ["data-unified", "The cell's unified code."],
  ["data-row · data-column", "The cell's row, counted across the whole list, and its column."],
  ["data-open · data-closed", "SkinTone and EmojiPopover.Content: whether the options or the popover are open."],
  ["data-popup-open", "SkinTone.Trigger and EmojiPopover.Trigger while their popup is open."],
  ["data-starting-style · data-ending-style", "EmojiPopover.Content while it enters and exits."],
  ["data-pressed · data-hovered · data-focus-visible", "Cells, tabs and buttons, from React Aria's usePress, useHover (no hover on touch) and useFocusRing."],
  ["data-focused", "List, tabs and the search field while they hold DOM focus."],
  ["data-orientation", "Viewport, List, CategoryNav and SkinTone options: horizontal or vertical."],
];
