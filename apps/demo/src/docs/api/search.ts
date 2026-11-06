import type { EmojiPicker } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const search = rowsOf<EmojiPicker.Search.Props>()([
  { name: "children", type: "ReactNode | ({ empty }) => ReactNode", default: "<Search.Input />", description: "The row's contents. Search.Clear works anywhere inside Root." },
  { name: "onKeyDown", type: "(event: PickerEvent<KeyboardEvent>) => void", description: "Runs before the picker's handler; event.preventEmojiPickerHandler() skips it." },
]);

export const searchField = rowsOf<EmojiPicker.Search.Field.Props>()([
  { name: "children", type: "ReactNode", description: "React Aria's SearchField, around Search.Input and Search.Clear. Search.Input renders one when it isn't inside a Search.Field." },
  { name: "className", type: "string | ({ empty }) => string | undefined" },
]);

export const searchInput = rowsOf<EmojiPicker.Search.Input.Props>()([
  { name: "placeholder", type: "string", default: "labels.searchPlaceholder" },
  { name: "autoFocus", type: "boolean", default: "true inside an EmojiPopover" },
  { name: "className", type: "string | ({ hovered, focused, focusVisible, disabled }) => string | undefined" },
  { name: "onKeyDown", type: "(event: PickerEvent<KeyboardEvent>) => void", description: "Runs before the picker's handler; event.preventEmojiPickerHandler() skips it." },
  { name: "children", type: "ReactNode", default: "<Search.Clear />", description: "In the field, after the input." },
]);
