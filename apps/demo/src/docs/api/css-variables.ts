type Rows = [string, string, string][];

export const rootVariables: Rows = [
  ["--emoji-size", "30px", "Emoji size."],
  ["--emoji-image-size", "--emoji-size", "Image emoji size."],
  ["--emoji-cell-size", "--emoji-size + 10px", "Grid pitch: each cell's width and height."],
  ["--emoji-cell-width · --emoji-cell-height", "--emoji-cell-size", "Cell width and height, when they differ."],
  ["--emoji-picker-content-width", "—", "Output: List sets it to the grid's width."],
];

export const listVariables: Rows = [
  ["--emoji-list-padding", "10px", "Inline padding of the grid."],
  ["--emoji-list-padding-end", "--emoji-list-padding", "Inline-end padding of the grid."],
  ["--emoji-header-height", "40px", "Section title height."],
  ["--emoji-section-gap", "--emoji-list-padding", "Horizontal list: the gap between sections."],
  ["--emoji-section-min-width", "0px", "Horizontal list: the minimum section width."],
];

export const skinToneVariables: Rows = [["--emoji-skin-tone-size", "15px", "Swatch size."]];

export const popoverVariables: Rows = [
  ["--anchor-width · --anchor-height", "—", "Output: the Trigger's or anchor's size."],
  ["--available-width · --available-height", "—", "Output: the room left between the anchor and the viewport's edge, less collisionPadding."],
  ["--transform-origin", "—", "Output: the anchor's position, for animations."],
];

export const tokens: Rows = [
  ["--emoji-font-family", "system emoji fonts", "Font for native emoji."],
  ["--emoji-picker-background", "#fff / #171717", "Surface (bg-picker-background)."],
  ["--emoji-picker-foreground", "#171717 / #fafafa", "Text."],
  ["--emoji-picker-muted", "#737373 / #a3a3a3", "Section titles and secondary text."],
  ["--emoji-picker-subtle", "#a3a3a3 / #737373", "Placeholders and icons."],
  ["--emoji-picker-border", "#e5e5e5 / #2e2e2e", "Dividers and outline."],
  ["--emoji-picker-input", "#f5f5f5 / #262626", "Search field."],
  ["--emoji-picker-input-border", "#d4d4d4 / #404040", "Search field border."],
  ["--emoji-picker-panel", "#f5f5f5 / #262626", "Footers and side rails."],
  ["--emoji-picker-hover", "#f0f0f0 / #2a2a2a", "Hovered cell or tab."],
  ["--emoji-picker-selected", "#ebebeb / #333333", "Highlighted cell and active tab."],
  ["--emoji-picker-accent", "#171717 / #fafafa", "Active indicators."],
  ["--emoji-picker-ring", "#a3a3a3 / #737373", "Focus ring."],
  ["--emoji-picker-radius", "10px", "Corner radius (rounded-picker)."],
  ["--emoji-picker-shadow", "shadow-lg", "Shadow (shadow-picker)."],
  ["--emoji-picker-font", "--font-sans", "Text font (font-picker)."],
];

export const rendering: Rows = [
  ["System font", "tokens.css sets --emoji-font-family", 'The default. renderer="auto" draws an image wherever the font can\'t.'],
  ["Twemoji font", '@import "@brianhung/emoji-picker-twemoji-font/twemoji.css"; --emoji-font-family: Twemoji', "Subsets load as they are drawn. Twemoji is CC-BY 4.0: credit it."],
  ["Any font", '--emoji-font-family: "Noto Color Emoji"', "Any color emoji font, such as one from Google Fonts."],
  ["Images", '<EmojiProvider renderer="image">', "Twemoji images from jsDelivr."],
  ["Custom art", "<EmojiProvider imageUrl={(unified) => art[unified]}>", "undefined keeps the default for the other emoji."],
  ["Custom emoji", "<EmojiProvider customEmojis={[{ id, name, imageUrl }]}>", "Image emoji with shortcodes, in their own sections."],
];
