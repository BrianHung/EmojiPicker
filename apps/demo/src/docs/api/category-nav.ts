import type { EmojiPicker } from "emoji-components";
import { inPart, rowsOf } from "./rows";

export const categoryNav = rowsOf<EmojiPicker.CategoryNav.Props>()([
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "children", type: "(category: EmojiPickerNavCategory) => ReactNode", default: "<CategoryNavTab />", description: "Each section's tab, from { id, name, icon }." },
  { name: "className", type: "string | ({ orientation, disabled }) => string | undefined" },
  { name: "onKeyDown", type: "(event: EmojiComponentsEvent<KeyboardEvent>) => void", description: "Runs before the picker's handler; event.preventEmojiComponentsHandler() skips it." },
]);

export const categoryNavTab = rowsOf<EmojiPicker.CategoryNavTab.Props>()([
  { name: "className", type: "string | ({ category, selected, active, focused, focusVisible, hovered, pressed, disabled }) => string | undefined" },
  { name: "children", type: "ReactNode | (state) => ReactNode", default: "the category's icon", description: "EmojiPickerCategoryIcon draws the built-in icons." },
]);

export const categoryNavParts = [...categoryNav, ...inPart("CategoryNavTab", categoryNavTab)];
