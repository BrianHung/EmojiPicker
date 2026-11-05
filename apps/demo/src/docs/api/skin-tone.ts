import type { SkinToneGlyphProps, SkinToneOptionProps, SkinToneOptionsProps, SkinToneProps, SkinToneTriggerProps } from "@brianhung/emoji-picker-react";
import { rowsOf, rowsOfParts } from "./rows";

export const skinTone = [
  ...rowsOf<SkinToneProps>()([
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
    { name: "open", type: "boolean", description: "The options show. Controlled." },
    { name: "defaultOpen", type: "boolean", default: "false" },
    { name: "onOpenChange", type: "(open: boolean) => void" },
    { name: "children", type: "ReactNode | ({ open, tone }) => ReactNode", default: "Trigger, Options" },
  ]),
  ...rowsOfParts<{ Trigger: SkinToneTriggerProps; Options: SkinToneOptionsProps; Option: SkinToneOptionProps; Glyph: SkinToneGlyphProps }>()([
    { name: "Trigger › children", type: "ReactNode | ({ open, tone }) => ReactNode", default: "a swatch" },
    { name: "Options › children", type: "(tone: SkinToneValue) => ReactNode", default: "<SkinTone.Option />" },
    { name: "Option › tone", type: "SkinToneValue", description: "0 (none) to 5. State: { tone, selected }." },
    { name: "Glyph › emoji", type: "string", default: '"✋"', description: "In the tone of its Option, else the current one." },
  ]),
];
