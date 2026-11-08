import type { EmojiPicker } from "emoji-components";
import { rowsOf, rowsOfParts } from "./rows";

export const skinTone = [
  ...rowsOf<EmojiPicker.SkinTone.Props>()([
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
    { name: "open", type: "boolean", description: "Whether the options are open. Controlled." },
    { name: "defaultOpen", type: "boolean", default: "false" },
    { name: "onOpenChange", type: '(open: boolean, details: { reason: "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "imperative-action" | "none", event, trigger, cancel(), allowPropagation() }) => void' },
    { name: "children", type: "ReactNode | ({ open, tone }) => ReactNode", default: "SkinToneTrigger, SkinToneOptions" },
  ]),
  ...rowsOfParts<{ SkinToneTrigger: EmojiPicker.SkinToneTrigger.Props; SkinToneOptions: EmojiPicker.SkinToneOptions.Props; SkinToneOption: EmojiPicker.SkinToneOption.Props; SkinToneGlyph: EmojiPicker.SkinToneGlyph.Props }>()([
    { name: "SkinToneTrigger › children", type: "ReactNode | ({ open, tone, hovered, pressed, focusVisible, … }) => ReactNode", default: "a swatch" },
    { name: "SkinToneOptions › children", type: "(tone: SkinToneValue) => ReactNode", default: "<SkinToneOption />" },
    { name: "SkinToneOption › tone", type: "SkinToneValue", default: "the SkinToneOptions child's tone", description: "0 (none) to 5. State: { tone, selected, hovered, pressed, focusVisible, … }." },
    { name: "SkinToneGlyph › emoji", type: "string", default: '"✋"', description: "Drawn in its SkinToneOption's tone, or in the current tone outside one." },
  ]),
];
