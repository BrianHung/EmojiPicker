import type { ReactionsExpandProps, ReactionsItemProps, ReactionsProps, TapbackProps } from "@brianhung/emoji-picker";
import { rowsOf, rowsOfParts } from "./rows";

export const tapback = rowsOf<TapbackProps>()([
  { name: "onSelect", type: "(selection: EmojiSelection) => void" },
  { name: "count", type: "number", default: "5", description: "Number of frequent emoji in the row." },
  { name: "reactions", type: "readonly string[]", description: "Fixed reactions instead of the user's top emoji." },
  { name: "collapseOnSelect", type: "boolean", default: "true" },
  { name: "expandable", type: "boolean", default: "true", description: "Shows the expand button." },
  { name: "selected", type: "readonly string[]", description: "The user's reactions: toggle buttons, pressed." },
  { name: "children", type: "ReactNode", default: "<Reactions />", description: "Reactions, and a Panel with the expanded picker. Accepts Root props." },
]);

export const reactions = [
  ...rowsOf<ReactionsProps>()([{ name: "children", type: "ReactNode | (emoji: string) => ReactNode", default: "Items, then Expand", description: "Each reaction, or Reactions.Items and Reactions.Expand." }]),
  ...rowsOfParts<{ Item: ReactionsItemProps; Expand: ReactionsExpandProps }>()([
    { name: "Item › emoji", type: "string", description: "Unified code. State: { hovered, focused, focusVisible, pressed, disabled, selected }." },
    { name: "Expand › children", type: "ReactNode | (state) => ReactNode", default: "a plus" },
  ]),
];
