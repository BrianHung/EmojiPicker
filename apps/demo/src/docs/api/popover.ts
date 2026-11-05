import type { PropRow } from "@/components/site/docs";

export const popoverRoot: PropRow[] = [
  { name: "open", type: "boolean" },
  { name: "defaultOpen", type: "boolean", default: "false" },
  { name: "onOpenChange", type: "(open: boolean) => void" },
  { name: "closeOnSelect", type: "boolean", default: "true", description: "Closes when a picker inside selects an emoji." },
];

export const popoverTrigger: PropRow[] = [{ name: "render", type: "ReactElement", description: "Merges props onto this element." }];

export const popoverContent: PropRow[] = [
  { name: "side", type: '"top" | "bottom"', default: '"bottom"', description: "Flips when there isn't room." },
  { name: "align", type: '"start" | "center" | "end"', default: '"start"' },
  { name: "sideOffset", type: "number", default: "8" },
  { name: "collisionPadding", type: "number", default: "8" },
  { name: "container", type: "HTMLElement | false", default: "document.body", description: "Portal target. false renders in place." },
  { name: "anchor", type: "Element | VirtualElement | () => …", description: "Positions against this element instead of the Trigger." },
  { name: "finalFocus", type: "HTMLElement | RefObject | () => HTMLElement", default: "the Trigger", description: "Focused once a pick closes the content." },
  { name: "duration", type: "number", default: "0", description: "Floating UI only: ms the content stays mounted with data-ending-style after closing." },
];
