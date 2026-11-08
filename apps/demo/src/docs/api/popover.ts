import type { EmojiPopover, EmojiSuggestions } from "emoji-components/floating-ui";
import { inPart, rowsOf } from "./rows";

const onOpenChange = {
  name: "onOpenChange",
  type: '(open: boolean, details: { reason: "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "scroll" | "imperative-action" | "none", event, trigger, cancel() }) => void',
  description: "details.cancel() keeps the current state; trigger is the Trigger element.",
} as const;

const onOpenChangeComplete = { name: "onOpenChangeComplete", type: "(open: boolean) => void", description: "After the popup's CSS animations and transitions finish." } as const;

export const popoverRoot = rowsOf<EmojiPopover.Root.Props>()([
  { name: "open", type: "boolean" },
  { name: "defaultOpen", type: "boolean", default: "false" },
  onOpenChange,
  onOpenChangeComplete,
  { name: "modal", type: "boolean", default: "false (/floating-ui), true (/react-aria)", description: "Traps focus and hides the page from assistive technology." },
  { name: "actionsRef", type: "Ref<{ close(): void }>", description: "Closes the popover with reason imperative-action." },
]);

export const popoverTrigger = rowsOf<EmojiPopover.Trigger.Props>()([{ name: "render", type: "ReactElement | (props, { open, hovered, pressed, focusVisible, … }) => ReactElement", description: "Merges props onto this element." }]);

export const popoverRootParts = [...inPart("Root", popoverRoot), ...inPart("Trigger", popoverTrigger)];

export const popoverPortal = rowsOf<EmojiPopover.Portal.Props>()([{ name: "container", type: "HTMLElement | ShadowRoot | RefObject | null", default: "document.body", description: "The element to render the popup into." }]);

const side = {
  name: "side",
  type: '"top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"',
  default: '"bottom"',
  description: "Flips when there is not enough room. inline-start and inline-end follow the locale's direction.",
} as const;

export const popoverPositioner = rowsOf<EmojiPopover.Positioner.Props>()([
  side,
  { name: "align", type: '"start" | "center" | "end"', default: '"start"' },
  { name: "sideOffset", type: "number", default: "8", description: "Distance from the anchor." },
  { name: "alignOffset", type: "number", default: "0", description: "Offset along the alignment axis, away from the aligned edge." },
  { name: "collisionPadding", type: "number", default: "8", description: "Space kept from the viewport's edges." },
  {
    name: "anchor",
    type: "Element | RefObject<Element> | { getBoundingClientRect() } | (() => Element | { getBoundingClientRect() } | DOMRect | null) | null",
    description: "Positions against this instead of the Trigger. A function is read on each update, as a caret moves.",
  },
  { name: "className", type: "string | ({ open, side, align }) => string | undefined" },
]);

export const popoverPopup = rowsOf<EmojiPopover.Popup.Props>()([
  {
    name: "initialFocus",
    type: "boolean | RefObject | (openType) => HTMLElement | boolean | null | undefined",
    default: "emojiPickerInitialFocus",
    description: "Focused once the popup opens. openType is mouse, touch, pen, keyboard, or empty; true or null keeps the default, false leaves focus where it is.",
  },
  {
    name: "finalFocus",
    type: "boolean | RefObject | (closeType) => HTMLElement | boolean | null | undefined",
    default: "the Trigger",
    description: "Focused once the popup closes. closeType is mouse, touch, pen, keyboard, or empty; true or null returns focus to the Trigger, false leaves it where it is.",
  },
  { name: "className", type: "string | ({ open, side, align, transitionStatus }) => string | undefined" },
]);

export const suggestionsRoot = rowsOf<EmojiSuggestions.Root.Props>()([{ name: "open", type: "boolean" }, onOpenChange, onOpenChangeComplete]);

export const suggestionsParts = [
  ...inPart("Root", suggestionsRoot),
  ...inPart(
    "Positioner",
    rowsOf<EmojiSuggestions.Positioner.Props>()([
      { name: "anchor", type: "EmojiPopoverAnchor", description: "Required: the typeahead's anchor, at the caret." },
      { name: "sideOffset", type: "number", default: "4" },
    ]),
  ),
];
