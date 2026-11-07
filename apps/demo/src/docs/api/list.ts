import type { PropRow } from "@/components/site/docs";
import type { EmojiPicker } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const list = rowsOf<EmojiPicker.List.Props>()([
  { name: "children", type: "(section: EmojiSection) => ReactNode", default: "title and cells", description: "Called only for the sections in view." },
  { name: "orientation", type: '"vertical" | "horizontal"', default: '"vertical"' },
  { name: "rows", type: "number", default: "5", description: "Horizontal only: rows per section." },
  { name: "renderEmptyState", type: "(state: EmojiPicker.List.EmptyState) => ReactNode", description: "Shown in the list while data loads, after it fails, and when nothing matches." },
  { name: "onKeyDown", type: "(event: PickerEvent<KeyboardEvent>) => void", description: "Runs before the picker's handler; event.preventEmojiPickerHandler() skips it." },
]);

export const listParts: PropRow[] = [
  { name: "ListSection", type: "{ section, collapsed }", description: "A section (group) with ListSectionTitle, ListItems, and ListSectionActions." },
  { name: "ListSectionTitle", type: "{ section, collapsed }", default: "section.name", description: "The section title, inside the listbox. Sticks to the top of a vertical list and to the start of a horizontal one." },
  { name: "ListItems › children", type: "(emoji: EmojiItem) => ReactNode", default: "<ListCell />", description: "Called only for the emoji in view." },
  {
    name: "ListCell",
    type: "{ emoji, row, column, highlighted, hovered, focused, focusVisible, pressed, selected }",
    default: "the glyph",
    description: "An option. Re-renders only when its own state changes. onClick and pointer handlers can call event.preventEmojiPickerHandler().",
  },
  { name: "ListSectionActions", type: "{ section, collapsed, toggle, toggleProps }", description: "Controls over the title, outside the listbox." },
  {
    name: "ListVariations",
    type: "{ emoji, tone }",
    default: "rendered by List",
    description: "The skin-tone popup a long press or Shift+Space opens. Render it in Root, beside List in the Viewport, to style it. children: (tone) => ReactNode.",
  },
  { name: "ListVariationsOption", type: "{ emoji, unified, tone, selected, highlighted, hovered, focused, focusVisible }", description: "One tone. tone defaults to the one ListVariations' children were called with." },
];
