import type { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";
import { inPart, rowsOf } from "./rows";

export const popoverRoot = rowsOf<EmojiPopover.Root.Props>()([
  { name: "open", type: "boolean" },
  { name: "defaultOpen", type: "boolean", default: "false" },
  {
    name: "onOpenChange",
    type: '(open: boolean, details: { reason: "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "scroll" | "imperative-action" | "none", event, trigger, cancel() }) => void',
    description: "details.cancel() keeps the current state; trigger is the Trigger element. EmojiSuggestions.Popover takes the same callback.",
  },
  { name: "onOpenChangeComplete", type: "(open: boolean) => void", description: "After the content's CSS animations and transitions finish." },
  { name: "modal", type: "boolean", default: "false (/floating-ui), true (/react-aria)", description: "Traps focus and hides the page from assistive technology." },
  { name: "actionsRef", type: "Ref<{ close(): void }>", description: "Closes the popover with reason imperative-action." },
  { name: "closeOnSelect", type: "boolean", default: "true", description: "Closes when a picker inside selects an emoji." },
]);

export const popoverTrigger = rowsOf<EmojiPopover.Trigger.Props>()([{ name: "render", type: "ReactElement | (props, { open, hovered, pressed, focusVisible, … }) => ReactElement", description: "Merges props onto this element." }]);

export const popoverContent = rowsOf<EmojiPopover.Content.Props>()([
  { name: "side", type: '"top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"', default: '"bottom"', description: "Flips when there is not enough room. inline-start and inline-end follow the locale's direction." },
  { name: "align", type: '"start" | "center" | "end"', default: '"start"' },
  { name: "sideOffset", type: "number", default: "8" },
  { name: "collisionPadding", type: "number", default: "8" },
  { name: "container", type: "HTMLElement | ShadowRoot | RefObject | false", default: "document.body", description: "The portal target. false renders in place." },
  { name: "anchor", type: "EmojiPopoverAnchor", description: "Positions against this element, { getBoundingClientRect } object, or function instead of the Trigger." },
  {
    name: "initialFocus",
    type: "boolean | RefObject | (openType) => HTMLElement | boolean | null | undefined",
    default: "pickerInitialFocus",
    description: "Focused once the content opens. openType is mouse, touch, pen, keyboard, or empty; true or null keeps the default, false leaves focus where it is.",
  },
  {
    name: "finalFocus",
    type: "boolean | RefObject | (closeType) => HTMLElement | boolean | null | undefined",
    default: "the Trigger",
    description: "Focused once a pick closes the content; other closes return focus to the Trigger. false leaves focus where onSelect put it.",
  },
  { name: "render", type: "ReactElement | (props, { open, side, align }) => ReactElement", description: "Merges props onto this element." },
  { name: "className", type: "string | ({ open, side, align }) => string | undefined" },
]);

export const popoverParts = [...popoverRoot, ...inPart("Content", popoverContent)];
