import type { PropRow } from "@/components/site/docs";

export const search: PropRow[] = [{ name: "children", type: "ReactNode", default: "<Search.Input />", description: "The row's contents." }];

export const searchInput: PropRow[] = [
  { name: "placeholder", type: "string", default: "Root's searchPlaceholder" },
  { name: "autoFocus", type: "boolean", default: "Root's autoFocusSearch" },
  { name: "children", type: "ReactNode", default: "<Search.Clear />", description: "In the field, after the input." },
];
