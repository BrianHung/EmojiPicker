import type { SearchInputProps, SearchProps } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const search = rowsOf<SearchProps>()([
  { name: "children", type: "ReactNode | ({ empty }) => ReactNode", default: "<Search.Input />", description: "The row's contents." },
  { name: "onKeyDown", type: "PickerKeyboardEventHandler", description: "Runs before the picker's handler; event.preventEmojiPickerHandler() skips it." },
]);

export const searchInput = rowsOf<SearchInputProps>()([
  { name: "placeholder", type: "string", default: "labels.searchPlaceholder" },
  { name: "autoFocus", type: "boolean", default: "inside an EmojiPopover" },
  { name: "className", type: "string | ({ hovered, focused, focusVisible, disabled }) => string | undefined" },
  { name: "onKeyDown", type: "PickerKeyboardEventHandler", description: "Runs before the picker's handler; event.preventEmojiPickerHandler() skips it." },
  { name: "children", type: "ReactNode", default: "<Search.Clear />", description: "In the field, after the input." },
]);
