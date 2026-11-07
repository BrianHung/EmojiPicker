import type { EmojiPicker } from "@brianhung/emoji-picker-react";
import { rowsOf, rowsOfParts } from "./rows";

export const reactions = [
  ...rowsOf<EmojiPicker.Reactions.Props>()([
    { name: "value", type: "readonly string[]", description: "The user's reactions. With value, defaultValue, or onValueChange, items are toggle buttons, pressed when their emoji is listed in any skin tone. Controlled." },
    { name: "defaultValue", type: "readonly string[]" },
    {
      name: "onValueChange",
      type: '(value: readonly string[], details: { reason: "item-press", emoji, pressed, event, cancel() }) => void',
      description: "details.pressed is whether the press added the reaction. Only an added reaction calls onSelect.",
    },
    { name: "children", type: "ReactNode | (emoji: string) => ReactNode", default: "ReactionsItems, then ReactionsExpand", description: "Each reaction, or ReactionsItems and ReactionsExpand." },
  ]),
  ...rowsOfParts<{ ReactionsItem: EmojiPicker.ReactionsItem.Props; ReactionsExpand: EmojiPicker.ReactionsExpand.Props; Panel: EmojiPicker.Panel.Props }>()([
    { name: "ReactionsItem › emoji", type: "string", description: "Unified code. State: { hovered, focused, focusVisible, pressed, disabled, selected }." },
    { name: "ReactionsExpand › children", type: "ReactNode | (state) => ReactNode", default: "a plus", description: "Shown while a Panel is rendered. Closes the row to show the Panel; Escape with no query brings it back." },
    { name: "Panel › children", type: "ReactNode | (state) => ReactNode", description: "The full picker, hidden while the reaction row shows." },
  ]),
];
