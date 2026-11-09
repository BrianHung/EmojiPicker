import type { EmojiPopover, EmojiSuggestions } from "emoji-components/floating-ui";
import { className, rowsOf } from "./rows";

const onOpenChangeComplete = { name: "onOpenChangeComplete", type: "(open: boolean) => void", description: "Runs after the popup's CSS animations and transitions finish." } as const;

export const popoverRoot = rowsOf<EmojiPopover.Root.Props>()([
  { name: "open", type: "boolean", description: "Whether the popover is open. Controlled." },
  { name: "defaultOpen", type: "boolean", default: "`false`" },
  {
    name: "onOpenChange",
    type: '(open: boolean, details: { reason: "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "scroll" | "imperative-action" | "none", event, trigger, cancel() }) => void',
    description: "`details.cancel()` keeps the current state. `details.trigger` is the `Trigger` element.",
  },
  onOpenChangeComplete,
  { name: "modal", type: "boolean", default: "`false` from `/floating-ui`, `true` from `/react-aria`", description: "Traps focus and hides the rest of the page from assistive technology." },
  { name: "actionsRef", type: "Ref<{ close(): void }>", description: '`close()` closes the popover with reason `"imperative-action"`.' },
]);

export const popoverTrigger = rowsOf<EmojiPopover.Trigger.Props>()([
  { name: "render", type: "ReactElement | (props, state) => ReactElement", description: "Replaces the `<button>`, such as with your own `Button`." },
  className("{ open, hovered, focused, focusVisible, pressed, disabled }"),
]);

export const popoverPortal = rowsOf<EmojiPopover.Portal.Props>()([{ name: "container", type: "HTMLElement | ShadowRoot | RefObject | null", default: "`document.body`", description: "The element to render the popup into." }]);

const side = {
  name: "side",
  type: '"top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"',
  default: '`"bottom"`',
  description: 'Flips when there is not enough room. `"inline-start"` and `"inline-end"` follow the text direction.',
} as const;

const placement = [
  { name: "align", type: '"start" | "center" | "end"', default: '`"start"`' },
  { name: "alignOffset", type: "number", default: "`0`", description: "Offset along the alignment axis, away from the aligned edge." },
  { name: "collisionPadding", type: "number", default: "`8`", description: "Space kept from the edges of the viewport." },
] as const;

export const popoverPositioner = rowsOf<EmojiPopover.Positioner.Props>()([
  side,
  { name: "sideOffset", type: "number", default: "`8`", description: "Distance from the anchor." },
  ...placement,
  {
    name: "anchor",
    type: "Element | RefObject<Element> | { getBoundingClientRect() } | (() => Element | { getBoundingClientRect() } | DOMRect | null) | null",
    description: "Positions the popup against this instead of the `Trigger`. A function is read on each update, as a caret moves.",
  },
  className("{ open, side, align }"),
]);

export const popoverPopup = rowsOf<EmojiPopover.Popup.Props>()([
  {
    name: "initialFocus",
    type: "boolean | RefObject | (openType) => HTMLElement | boolean | null | undefined",
    default: "`emojiPickerInitialFocus`",
    description: 'Focused once the popup opens. `openType` is `"mouse"`, `"touch"`, `"pen"`, `"keyboard"`, or `""`. `true` or `null` keeps the default; `false` leaves focus where it is.',
  },
  {
    name: "finalFocus",
    type: "boolean | RefObject | (closeType) => HTMLElement | boolean | null | undefined",
    default: "the `Trigger`",
    description: "Focused once the popup closes. `true` or `null` returns focus to the `Trigger`; `false` leaves it where it is.",
  },
  className("{ open, side, align, transitionStatus }"),
]);

export const suggestionsRoot = rowsOf<EmojiSuggestions.Root.Props>()([
  { name: "open", type: "boolean", description: "Whether the menu is open, usually the typeahead's `open`. Controlled; required." },
  {
    name: "onOpenChange",
    type: '(open: boolean, details: { reason: "outside-press" | "none", event, cancel() }) => void',
    description: 'Runs when the menu asks to close, such as on a press outside it (`"outside-press"`). Call the typeahead\'s `dismiss()` to close it.',
  },
  onOpenChangeComplete,
]);

export const suggestionsPortal = rowsOf<EmojiSuggestions.Portal.Props>()([{ name: "container", type: "HTMLElement | ShadowRoot | RefObject | null", default: "`document.body`", description: "The element to render the menu into." }]);

export const suggestionsPositioner = rowsOf<EmojiSuggestions.Positioner.Props>()([
  { name: "anchor", type: "EmojiPopoverAnchor", description: "The typeahead's `anchor`, at the caret. Required." },
  side,
  { name: "sideOffset", type: "number", default: "`4`", description: "Distance from the anchor." },
  ...placement,
  className("{ open, side, align }"),
]);

export const suggestionsPopup = rowsOf<EmojiSuggestions.Popup.Props>()([className("{ open, side, align, transitionStatus }")]);
