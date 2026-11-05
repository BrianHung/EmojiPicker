import type { PropRow } from "@/components/site/docs";

export const tapback: PropRow[] = [
  { name: "onSelect", type: "(selection: EmojiSelection) => void" },
  { name: "count", type: "number", default: "5", description: "Number of emoji in the row." },
  { name: "collapseOnSelect", type: "boolean", default: "true" },
  { name: "expandable", type: "boolean", default: "true", description: "Shows the expand button." },
  { name: "selected", type: "string[]", description: "The user's reactions: toggle buttons, pressed." },
  { name: "children", type: "ReactNode", default: "<Reactions />", description: "Reactions, and a Panel with the expanded picker. Accepts Root props." },
];

export const reactions: PropRow[] = [
  { name: "children", type: "(emoji) => ReactNode | ReactNode", default: "Items, then Expand", description: "Each reaction, or Reactions.Items and Reactions.Expand." },
  { name: "Item › emoji", type: "string", description: "Unified code. State: React Aria's button state, with isSelected." },
  { name: "Expand › children", type: "ReactNode", default: "a plus" },
];
