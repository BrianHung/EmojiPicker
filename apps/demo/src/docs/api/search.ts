import type { EmojiPicker } from "emoji-components";
import { inPart, rowsOf } from "./rows";

export const search = rowsOf<EmojiPicker.Search.Props>()([
  { name: "children", type: "ReactNode | ({ empty }) => ReactNode", default: "<SearchInput />", description: "The row's contents. SearchClear works anywhere inside Root." },
  { name: "onKeyDown", type: "(event: EmojiComponentsEvent<KeyboardEvent>) => void", description: "Runs before the picker's handler; event.preventEmojiComponentsHandler() skips it." },
]);

export const searchField = rowsOf<EmojiPicker.SearchField.Props>()([
  { name: "children", type: "ReactNode", description: "React Aria's SearchField, around SearchInput and SearchClear. SearchInput renders one when it isn't inside a SearchField." },
  { name: "className", type: "string | ({ empty }) => string | undefined" },
]);

export const searchInput = rowsOf<EmojiPicker.SearchInput.Props>()([
  { name: "placeholder", type: "string", default: "labels.searchPlaceholder" },
  { name: "autoFocus", type: "boolean", default: "true inside an EmojiPopover" },
  { name: "className", type: "string | ({ hovered, focused, focusVisible, disabled }) => string | undefined" },
  { name: "onKeyDown", type: "(event: EmojiComponentsEvent<KeyboardEvent>) => void", description: "Runs before the picker's handler; event.preventEmojiComponentsHandler() skips it." },
  { name: "children", type: "ReactNode", default: "<SearchClear />", description: "In the field, after the input." },
]);

export const searchStatus = rowsOf<EmojiPicker.SearchStatus.Props>()([
  { name: "children", type: "ReactNode | ({ resultCount }) => ReactNode", default: "labels.resultCount(resultCount)", description: "A polite live region, as Base UI's Combobox.Status. Without one, Root renders a visually hidden one." },
  { name: "className", type: "string | ({ resultCount }) => string | undefined", description: "resultCount is null while not searching." },
]);

export const searchParts = [...search, ...inPart("SearchField", searchField), ...inPart("SearchInput", searchInput), ...inPart("SearchStatus", searchStatus)];
