import type { PropRow } from "@/components/site/docs";

export const list: PropRow[] = [
  { name: "children", type: "(section) => ReactNode", default: "title and cells", description: "Called only for the sections in view." },
  { name: "orientation", type: '"vertical" | "horizontal"', default: '"vertical"' },
  { name: "rows", type: "number", default: "5", description: "Horizontal only: rows per section." },
  { name: "searchRows", type: "number", default: "rows", description: "Horizontal only: rows while search results show." },
  { name: "value", type: "string | null", description: "A value picker: the emoji shown as chosen (aria-selected)." },
];

export const listParts: PropRow[] = [
  { name: "List.Section", type: "{ section, collapsed }", description: "A section (group): List.SectionTitle, List.Items, List.SectionActions." },
  { name: "List.SectionTitle", type: "{ section, collapsed }", default: "section.name", description: "Text in the listbox, sticky where the layout puts it." },
  { name: "List.Items › children", type: "(emoji: EmojiItem) => ReactNode", default: "<List.Cell />", description: "Called only for the emoji in view." },
  { name: "List.Cell", type: "{ emoji, highlighted, active, hovered, focused, focusVisible, pressed, selected }", default: "the glyph", description: "An option; re-renders only when its own state changes." },
  { name: "List.SectionActions", type: "{ section, collapsed, toggle, toggleProps }", description: "Controls over the title, outside the listbox." },
];
