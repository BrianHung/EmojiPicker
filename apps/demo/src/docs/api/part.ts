import type { PropRow } from "@/components/site/docs";

export const part: PropRow[] = [
  { name: "render", type: "ReactElement | (props, state) => ReactElement", description: "Replaces the element: its props and ref merge with the part's." },
  { name: "className", type: "string | (state) => string", description: "A function receives the part's state." },
  { name: "style", type: "CSSProperties | (state) => CSSProperties" },
];
