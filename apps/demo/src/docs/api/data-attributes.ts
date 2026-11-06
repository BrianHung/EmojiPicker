type Rows = [string, string][];

const interaction: [string, string] = ["data-pressed · data-hovered · data-focus-visible", "From React Aria's usePress, useHover (no hover on touch), and useFocusRing."];

export const rootAttributes: Rows = [
  ["data-slot", "emoji-picker"],
  ["data-searching", "While search results show. Also on Viewport and List."],
  ["data-columns", "The columns prop."],
  ["data-reactions-open", "While the reaction row shows."],
];

export const searchAttributes: Rows = [
  ["data-slot", "emoji-picker-search, emoji-picker-search-field, emoji-picker-search-input, emoji-picker-search-clear, emoji-picker-search-status: The row, the field, the input, the clear button, and the result-count status."],
  ["data-empty", "Search and Search.Field with no query."],
  ["data-focused", "Search.Input while it holds focus."],
  interaction,
];

export const categoryNavAttributes: Rows = [
  ["data-slot", "emoji-picker-category-nav, emoji-picker-category-tab: The nav and each tab."],
  ["data-active", "The tab for the section in view."],
  ["data-disabled", "The nav and its tabs while search results show."],
  ["data-orientation", '"horizontal" or "vertical".'],
  interaction,
];

export const listAttributes: Rows = [
  ["data-slot", "emoji-picker-viewport, emoji-picker-list, emoji-picker-section, emoji-picker-section-title, emoji-picker-section-actions, emoji-picker-emoji: The scroll container, the list, sections, their titles and actions, and cells."],
  ["data-slot", "emoji-picker-variations, emoji-picker-variation: A cell's skin-tone variations and each option."],
  ["data-results", 'List while search results show: "ranked" or "grouped".'],
  ["data-empty", "List with nothing to show."],
  ["data-highlighted", "The cell or variation the keyboard or pointer is on."],
  ["data-focused", "The cell at the keyboard position, by DOM focus or the search field's aria-activedescendant."],
  ["data-selected", "A single-value picker's cell."],
  ["data-collapsed", "A collapsed section, its title, and its actions."],
  ["data-category · data-section", "A section's category id; List.SectionActions' section id."],
  ["data-has-variations · data-overridden · data-unified", "Cells with skin-tone variations, cells whose imageUrl replaces the glyph, and each cell's unified code."],
  ["data-row · data-column · data-index", "Cells: the row and column, and the index across the list."],
  ["data-orientation", '"horizontal" or "vertical".'],
  interaction,
];

export const skinToneAttributes: Rows = [
  ["data-slot", "emoji-picker-skin-tone, emoji-picker-skin-tone-trigger, emoji-picker-skin-tone-options, emoji-picker-skin-tone-option: The root, the trigger, the options, and each option."],
  ["data-open · data-closed", "SkinTone: whether the options are open."],
  ["data-popup-open", "The trigger while the options are open."],
  ["data-selected", "The current tone."],
  interaction,
];

export const reactionsAttributes: Rows = [
  ["data-slot", "emoji-picker-reactions, emoji-picker-emoji, emoji-picker-reactions-expand, emoji-picker-panel: The row, each item, its expand button, and the panel."],
  ["data-selected", "A pressed item when the row has a value."],
  ["data-overridden · data-unified", "Items whose imageUrl replaces the glyph, and each item's unified code."],
  interaction,
];

export const popoverTriggerAttributes: Rows = [["data-slot", "emoji-picker-popover-trigger."], ["data-popup-open", "While the popover is open."], interaction];

export const popoverPositionerAttributes: Rows = [
  ["data-slot", "emoji-picker-popover-positioner, emoji-picker-suggestions-positioner."],
  ["data-open · data-closed", "Whether the popup is open."],
  ["data-side · data-align", "The resolved placement."],
];

export const popoverPopupAttributes: Rows = [
  ["data-slot", "emoji-picker-popover-popup, emoji-picker-suggestions-popup."],
  ["data-open · data-closed", "Whether the popup is open."],
  ["data-starting-style · data-ending-style", "While the popup enters and exits."],
  ["data-side · data-align", "The resolved placement."],
];

export const emojiAttributes: Rows = [
  ["data-emoji", "Every rendered Emoji."],
  ["data-emoji-missing", "An input that resolves to no emoji."],
  ["data-overridden", "An emoji whose imageUrl replaces the native glyph."],
];
