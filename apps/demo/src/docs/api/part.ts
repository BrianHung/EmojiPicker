import type { PartProps } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const part = rowsOf<PartProps<unknown>>()([
  { name: "render", type: "ReactElement | (props, state) => ReactElement", description: "Replaces the element: its props and ref merge with the part's." },
  { name: "className", type: "string | (state) => string | undefined", description: "A function receives the part's state." },
  { name: "style", type: "CSSProperties | (state) => CSSProperties | undefined" },
]);
