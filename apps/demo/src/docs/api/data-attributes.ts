export const slots: [string, string][] = [
  ['data-slot="emoji-picker"', "Root"],
  ['data-slot="search" · "search-input" · "search-clear"', "Search row, its input and clear button"],
  ['data-slot="category-nav" · "category-tab"', "Category bar and each tab"],
  ['data-slot="viewport" · "list"', "Scroll container and the virtualized list"],
  ['data-slot="category-header" · "emoji"', "Section titles and cells"],
  ['data-slot="skin-tone" · "skin-tone-trigger" · "skin-tone-options" · "skin-tone-option"', "Skin tone, its trigger, the options and each option"],
  ['data-slot="reactions" · "reactions-expand" · "panel"', "Tapback row, its “+”, and the expanded picker"],
  ['data-slot="preview" · "empty" · "loading"', "Preview, no results, loading"],
];

export const stateAttributes: [string, string][] = [
  ["data-searching", "Root, Viewport and List while search results show."],
  ["data-highlighted", "Present on the highlighted cell."],
  ["data-active", "Present on the category tab for the section in view."],
  ["data-selected", "The category tab for the section in view; a value picker's cell; the current skin-tone option."],
  ["data-collapsed", "A collapsed section, its title and its actions."],
  ["data-disabled", "CategoryNav and its tabs while search results show."],
  ["data-empty", "Search with no query; List with nothing to show."],
  ["data-has-variations", "Present on cells with skin-tone variations."],
  ["data-unified", "The cell's unified code."],
  ["data-row · data-column", "The cell's row, counted across the whole list, and its column."],
  ['data-state="open" | "closed"', "SkinTone and its Trigger: whether the options are open."],
  ["data-orientation", "Viewport, List, CategoryNav and SkinTone options: horizontal or vertical."],
];
