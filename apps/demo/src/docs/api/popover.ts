import type { PopoverRootProps, PopoverTriggerProps } from "@brianhung/emoji-picker";
import type { PopoverContentProps } from "@brianhung/emoji-picker/floating-ui";
import { rowsOf } from "./rows";

export const popoverRoot = rowsOf<PopoverRootProps>()([
  { name: "open", type: "boolean" },
  { name: "defaultOpen", type: "boolean", default: "false" },
  { name: "onOpenChange", type: "(open: boolean) => void" },
  { name: "closeOnSelect", type: "boolean", default: "true", description: "Closes when a picker inside selects an emoji." },
]);

export const popoverTrigger = rowsOf<PopoverTriggerProps>()([{ name: "render", type: "ReactElement | (props, { open }) => ReactElement", description: "Merges props onto this element." }]);

export const popoverContent = rowsOf<PopoverContentProps>()([
  { name: "side", type: '"top" | "bottom"', default: '"bottom"', description: "Flips when there isn't room." },
  { name: "align", type: '"start" | "center" | "end"', default: '"start"' },
  { name: "sideOffset", type: "number", default: "8" },
  { name: "collisionPadding", type: "number", default: "8" },
  { name: "container", type: "HTMLElement | false", default: "document.body", description: "Portal target. false renders in place." },
  { name: "anchor", type: "PopoverAnchor", description: "Positions against this (an element, { getBoundingClientRect } or a function) instead of the Trigger." },
  { name: "initialFocus", type: "RefObject | () => HTMLElement | false", default: "pickerInitialFocus", description: "Focused once the content opens; false leaves focus where it is." },
  { name: "finalFocus", type: "HTMLElement | RefObject | () => HTMLElement", default: "the Trigger", description: "Focused once a pick closes the content." },
  { name: "className", type: "string | ({ open, side, align }) => string | undefined" },
  { name: "duration", type: "number | { open?: number; close?: number }", default: "0", description: "Floating UI only: ms the content stays mounted with data-ending-style after closing." },
]);
