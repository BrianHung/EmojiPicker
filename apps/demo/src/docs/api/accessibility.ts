export const roles: [string, string][] = [
  ["Search", "A searchbox with aria-activedescendant, and a polite status for the result count."],
  ["List", "A listbox, with a group per section and an option per emoji. aria-busy is set during an async search."],
  ["CategoryNav", "A tablist of tabs."],
  ["SkinTone", "A button with aria-haspopup and aria-expanded that opens a radiogroup."],
  ["Variations", "Shift+Space or a long press opens a listbox of six tones."],
  ["Reactions, ReactionBar", "A toolbar. Items are toggle buttons with aria-pressed when selected is set."],
  ["EmojiPopover", 'A dialog, non-modal from /floating-ui and modal from /react-aria. The trigger has aria-haspopup="dialog" and aria-expanded.'],
  ["Typeahead", "combobox and listbox props for the field and the menu."],
  ["Emoji", 'role="img". decorative hides it.'],
];
