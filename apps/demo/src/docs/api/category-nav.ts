import type { CategoryNavProps, CategoryTabProps } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const categoryNav = rowsOf<CategoryNavProps>()([
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "children", type: "(category: NavCategory) => ReactNode", default: "<CategoryNav.Tab />", description: "Each section's tab, from { id, name, icon }." },
  { name: "className", type: "string | ({ orientation, disabled }) => string | undefined" },
  { name: "onKeyDown", type: "PickerKeyboardEventHandler", description: "Runs before the picker's handler; event.preventEmojiPickerHandler() skips it." },
]);

export const categoryNavTab = rowsOf<CategoryTabProps>()([
  { name: "className", type: "string | ({ category, selected, active, focused, focusVisible, hovered, pressed, disabled }) => string | undefined" },
  { name: "children", type: "ReactNode | (state) => ReactNode", default: "the category's icon", description: "DefaultCategoryIcon draws the built-in icons." },
]);
