import type { EmojiPicker } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const root = rowsOf<EmojiPicker.Root.Props>()([
  { name: "onSelect", type: '(selection: EmojiSelection, details: { reason: "item-press" | "imperative-action", event?, cancel(), collapse? }) => void', description: "cancel() keeps the value and the popover open." },
  { name: "columns", type: '"fit" | number', default: '"fit"', description: "Emoji per row: as many as fit the width, or exactly this many." },
  {
    name: "categories",
    type: "readonly CategoryOption[]",
    description:
      'Sections in order: { id, name?, icon?, nav? }. Ids are "suggested" (frequently used), a group id such as "smileys_people", "custom" (custom emoji without a group), and "custom:<group>". Custom sections not listed follow the listed ones.',
  },
  { name: "frequent", type: "number | false", default: "16", description: "Number of frequently used emoji. false hides the section." },
  { name: "suggested", type: "readonly string[]", description: "Fixed emoji shown in place of frequently used emoji." },
  { name: "searchResults", type: '"ranked" | "grouped"', default: '"ranked"' },
  { name: "searchLimit", type: "number", default: "200" },
  { name: "query", type: "string", description: "The search text. Controlled." },
  { name: "defaultQuery", type: "string" },
  { name: "onQueryChange", type: '(query: string, details: { reason: "input-change" | "clear-press" | "escape-key" | "imperative-action" | "none", event?, cancel(), allowPropagation() }) => void' },
  { name: "value", type: "string | null", description: "The selected emoji, for a single-value picker such as a page icon. Compared without skin tone. Controlled." },
  { name: "defaultValue", type: "string | null" },
  { name: "onValueChange", type: '(unified: string | null, details: { reason: "item-press" | "imperative-action", event?, cancel() }) => void', description: "Fires with or without value; passing only onValueChange tracks the value." },
  { name: "highlight", type: "string | null", description: 'The highlighted emoji, shared by keyboard and pointer: a unified code, or an item key ("smileys_people:1f600") for one section. Controlled.' },
  { name: "defaultHighlight", type: "string | null" },
  { name: "onHighlightChange", type: '(unified: string | null, details: { reason: "keyboard" | "pointer" | "imperative-action" | "none", key, event?, cancel() }) => void', description: "details.key is the section-scoped item key." },
  { name: "reactions", type: "readonly string[] | number", description: "Unified codes shown in EmojiPicker.Reactions. A number shows that many frequently used emoji." },
  { name: "reactionsOpen", type: "boolean", description: "Whether the reaction row shows instead of Panel. Controlled." },
  { name: "defaultReactionsOpen", type: "boolean", default: "true" },
  { name: "onReactionsOpenChange", type: '(open: boolean, details: { reason: "trigger-press" | "item-press" | "escape-key" | "none", cancel() }) => void' },
  { name: "onKeyDown", type: "(event: PickerEvent<KeyboardEvent>) => void", description: "Runs before the picker's handler; event.preventEmojiPickerHandler() skips it. Every handler a part composes takes the same method." },
  { name: "actionsRef", type: "Ref<EmojiPickerActions>", description: "move, pick, highlight, focusSearch, clearSearch, close, and toggleSkinTone. Inside Root, use useEmojiPickerActions()." },
  {
    name: "keyboardTarget",
    type: "HTMLElement | RefObject<HTMLElement | null> | null",
    description: "An element that keeps focus, such as an editor. Its arrow keys, Page Up, Page Down, and Enter drive the picker, and it gets aria-activedescendant.",
  },
  { name: "collapsedCategories", type: "readonly string[]", description: "Collapsed section ids. Controlled." },
  { name: "defaultCollapsedCategories", type: "readonly string[]" },
  { name: "onCollapsedCategoriesChange", type: '(ids: readonly string[], details: { reason: "trigger-press" | "none", cancel() }) => void' },
  { name: "emojiVersion", type: "number", description: "Hides emoji added after this Unicode emoji version." },
  { name: "disableVariations", type: "boolean", default: "false", description: "Disables per-emoji skin-tone variations (long press and Shift+Space)." },
]);
