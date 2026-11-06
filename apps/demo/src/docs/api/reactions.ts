import type { PanelProps, ReactionsExpandProps, ReactionsItemProps, ReactionsProps } from "@brianhung/emoji-picker-react";
import { rowsOf, rowsOfParts } from "./rows";

export const reactions = [
  ...rowsOf<ReactionsProps>()([
    { name: "selected", type: "readonly string[]", description: "The user's reactions. Items become toggle buttons, pressed when their emoji is listed here in any skin tone." },
    { name: "children", type: "ReactNode | (emoji: string) => ReactNode", default: "Items, then Expand", description: "Each reaction, or Reactions.Items and Reactions.Expand." },
  ]),
  ...rowsOfParts<{ Item: ReactionsItemProps; Expand: ReactionsExpandProps; Panel: PanelProps }>()([
    { name: "Item › emoji", type: "string", description: "Unified code. State: { hovered, focused, focusVisible, pressed, disabled, selected }." },
    { name: "Expand › children", type: "ReactNode | (state) => ReactNode", default: "a plus", description: "Shown while a Panel is rendered. Closes the row to show the Panel." },
    { name: "Panel › children", type: "ReactNode | (state) => ReactNode", description: "The full picker, hidden while the reaction row shows." },
  ]),
];
