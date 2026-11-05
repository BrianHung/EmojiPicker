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
  ["data-highlighted", "Present on the highlighted cell."],
  ["data-active", "Present on the category tab for the section in view."],
  ["data-has-variations", "Present on cells with skin-tone variations."],
  ["data-unified", "The cell's unified code."],
  ['data-state="open" | "closed"', "Present on SkinTone. Whether the options are open."],
  ["data-orientation", "SkinTone options: horizontal or vertical."],
];
