import type { EmojiPicker } from "@brianhung/emoji-picker-react";
import { inPart, rowsOf } from "./rows";

export const categoryNav = rowsOf<EmojiPicker.CategoryNav.Props>()([
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "children", type: "(category: EmojiPickerNavCategory) => ReactNode", default: "<CategoryNavTab />", description: "Each section's tab, from { id, name, icon }." },
  { name: "className", type: "string | ({ orientation, disabled }) => string | undefined" },
  { name: "onKeyDown", type: "(event: PickerEvent<KeyboardEvent>) => void", description: "Runs before the picker's handler; event.preventEmojiPickerHandler() skips it." },
]);

export const categoryNavTab = rowsOf<EmojiPicker.CategoryNavTab.Props>()([
  { name: "className", type: "string | ({ category, selected, active, focused, focusVisible, hovered, pressed, disabled }) => string | undefined" },
  { name: "children", type: "ReactNode | (state) => ReactNode", default: "the category's icon", description: "DefaultCategoryIcon draws the built-in icons." },
]);

export const categoryNavParts = [...categoryNav, ...inPart("CategoryNavTab", categoryNavTab)];
