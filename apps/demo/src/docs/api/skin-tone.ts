import type { SkinToneGlyphProps, SkinToneOptionProps, SkinToneOptionsProps, SkinToneProps, SkinToneTriggerProps } from "@brianhung/emoji-picker-react";
import { rowsOf, rowsOfParts } from "./rows";

export const skinTone = [
  ...rowsOf<SkinToneProps>()([
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
    { name: "open", type: "boolean", description: "Whether the options are open. Controlled." },
    { name: "defaultOpen", type: "boolean", default: "false" },
    { name: "onOpenChange", type: '(open: boolean, details: { reason: "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "imperative-action" | "none", event?, cancel(), allowPropagation() }) => void' },
    { name: "children", type: "ReactNode | ({ open, tone }) => ReactNode", default: "Trigger, Options" },
  ]),
  ...rowsOfParts<{ Trigger: SkinToneTriggerProps; Options: SkinToneOptionsProps; Option: SkinToneOptionProps; Glyph: SkinToneGlyphProps }>()([
    { name: "Trigger › children", type: "ReactNode | ({ open, tone, hovered, pressed, focusVisible, … }) => ReactNode", default: "a swatch" },
    { name: "Options › children", type: "(tone: SkinToneValue) => ReactNode", default: "<SkinTone.Option />" },
    { name: "Option › tone", type: "SkinToneValue", default: "the Options child's tone", description: "0 (none) to 5. State: { tone, selected, hovered, pressed, focusVisible, … }." },
    { name: "Glyph › emoji", type: "string", default: '"✋"', description: "Drawn in its Option's tone, or in the current tone outside an Option." },
  ]),
];
