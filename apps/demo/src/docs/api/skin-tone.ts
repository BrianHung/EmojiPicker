import type { PropRow } from "@/components/site/docs";

export const skinTone: PropRow[] = [
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "children", type: "ReactNode", default: "Trigger, Options", description: "State: { open, tone }." },
  { name: "Trigger › children", type: "ReactNode | (state) => ReactNode", default: "a swatch" },
  { name: "Options › children", type: "(tone: number) => ReactNode", default: "<SkinTone.Option />" },
  { name: "Option › tone", type: "0–5", description: "State: { tone, selected }." },
  { name: "Glyph › emoji", type: "string", default: '"✋"', description: "In the tone of its Option, else the current one." },
];
