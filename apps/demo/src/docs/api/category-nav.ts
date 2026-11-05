import type { PropRow } from "@/components/site/docs";

export const categoryNav: PropRow[] = [
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "children", type: "(category) => ReactNode", default: "<CategoryNav.Tab />", description: "Each section's tab: { id, name, icon }." },
];

export const categoryNavTab: PropRow[] = [{ name: "className", type: "string | ({ selected, active, focusVisible, hovered, pressed, disabled }) => string" }];
