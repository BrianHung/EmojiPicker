export const roles: [string, string][] = [
  ["Search", "A searchbox with aria-activedescendant, and a polite status for the result count."],
  ["List", "A listbox, with a group per section and an option per emoji. aria-busy is set during an async search."],
  ["CategoryNav", "A toolbar of buttons that jump to a section; the one in view has aria-current. There are no tab panels: the sections are virtualized."],
  ["SkinTone", "A disclosure button with aria-expanded and aria-controls, for a toolbar of aria-pressed buttons. Arrows move focus; a press picks. Focus leaving closes it."],
  ["Variations", 'Shift+Space or a long press opens a listbox of six tones. Cells with variations have aria-keyshortcuts="Shift+Space".'],
  ["Reactions, ReactionBar", "A toolbar. Items are toggle buttons with aria-pressed when the row has a value. Expand is a disclosure for the Panel; Escape with no query returns to the row."],
  ["EmojiPopover", 'A dialog, non-modal from /floating-ui and modal from /react-aria. The trigger has aria-haspopup="dialog" and aria-expanded.'],
  ["Typeahead", "combobox and listbox props for the field and the menu."],
  ["Emoji", 'role="img". decorative hides it.'],
];
