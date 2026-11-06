import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { PopoverContext, type PopoverOpenChangeDetails, type PopoverOpenChangeReason, type PopoverState } from "./popover-context";
import { useChangeState } from "../utils/state";
import { renderElement, type InteractionState, type PartElementProps, type PartProps } from "../utils/render";
import { useInteraction } from "../utils/interaction";
import { SLOTS } from "../utils/slots";
import { TABBABLE } from "../utils/utils";

export type PopoverSide = "top" | "bottom";
export type PopoverAlign = "start" | "center" | "end";
export type PopoverAnchorRect = { top: number; left: number; width: number; height: number };
export type PopoverAnchor = { getBoundingClientRect(): PopoverAnchorRect } | (() => PopoverAnchorRect | null | undefined);

export const anchorRect = (anchor: PopoverAnchor | undefined) => {
  const r = typeof anchor === "function" ? anchor() : anchor?.getBoundingClientRect();
  return r ? new DOMRect(r.left, r.top, r.width, r.height) : undefined;
};

export type { PopoverOpenChangeDetails, PopoverOpenChangeReason };

export type PopoverRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: PopoverOpenChangeDetails) => void;
  closeOnSelect?: boolean;
  children: React.ReactNode;
};

export type PopoverTriggerState = InteractionState & { open: boolean };

export type PopoverTriggerProps = PartElementProps<PopoverTriggerState, HTMLButtonElement> & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "name" | "value">;

export type PopoverInitialFocus = React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | false;
export type PopoverFinalFocus = HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

export type PopoverPlacementProps = {
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
  collisionPadding?: number;
  container?: HTMLElement | false;
};

export type PopoverContentState = { open: boolean; side: PopoverSide; align: PopoverAlign };

export type PopoverContentProps = Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "style"> &
  PartProps<PopoverContentState, HTMLDivElement> &
  PopoverPlacementProps & {
    anchor?: PopoverAnchor;
    initialFocus?: PopoverInitialFocus;
    finalFocus?: PopoverFinalFocus;
  };

export type SuggestionsPopoverProps = React.HTMLAttributes<HTMLDivElement> &
  PopoverPlacementProps & {
    open: boolean;
    onOpenChange?: (open: boolean, details: PopoverOpenChangeDetails) => void;
    anchor: PopoverAnchor;
  };

// For popovers this package doesn't render, so all it has is their content element
export function pickerInitialFocus(root: Element | null | undefined): HTMLElement | null {
  if (!root) return null;
  const target = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"] [data-slot="${SLOTS.emoji}"][tabindex="0"]`);
  if (target) return target;
  if (root.querySelector(`[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"]`) || root.matches(`[data-slot="${SLOTS.root}"]`)) return null;
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].find((el) => el.tabIndex >= 0) ?? null;
}

export const initialFocusTarget = (initialFocus: PopoverInitialFocus | undefined, content: Element | null) =>
  (initialFocus === false ? null : typeof initialFocus === "function" ? initialFocus() : initialFocus ? initialFocus.current : pickerInitialFocus(content)) ?? null;

export const finalFocusTarget = (finalFocus: PopoverFinalFocus) => (typeof finalFocus === "function" ? finalFocus() : finalFocus instanceof HTMLElement ? finalFocus : finalFocus.current) ?? null;

type TransitionStatus = "starting" | "open" | "ending";

export const contentAttributes = ({ open, side, align, status, props }: PopoverContentState & { status: TransitionStatus; props: React.AriaAttributes }) => ({
  role: "dialog",
  "aria-label": props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Emoji picker"),
  "data-slot": SLOTS.popoverContent,
  "data-open": open ? "" : undefined,
  "data-closed": open ? undefined : "",
  "data-side": side,
  "data-align": align,
  "data-starting-style": status === "starting" ? "" : undefined,
  "data-ending-style": status === "ending" ? "" : undefined,
});

export type PopoverInternals = {
  state: PopoverState;
  trigger: HTMLElement | null;
  setTrigger: (el: HTMLElement | null) => void;
  triggerProps: (props: object) => Record<string, unknown>;
};

const InternalsContext = React.createContext<PopoverInternals | null>(null);

export function usePopoverInternals<T extends PopoverInternals>(part: string): T {
  const internals = React.useContext(InternalsContext);
  if (!internals) throw new Error(`EmojiPopover.${part} must be inside EmojiPopover.Root`);
  return internals as T;
}

export function usePopoverState({ open: controlled, defaultOpen = false, onOpenChange, closeOnSelect = true }: Omit<PopoverRootProps, "children">) {
  const [open, setState] = useChangeState(controlled, defaultOpen, onOpenChange);
  const selected = React.useRef(false);
  const setOpen = React.useCallback(
    (next: boolean, reason: PopoverOpenChangeReason, event?: Event) => {
      if (next) selected.current = false;
      setState(next, reason, event);
    },
    [setState],
  );
  // After the task's microtasks, so an editor focused in onSelect (Lexical updates in a microtask) keeps focus
  const close = React.useCallback(
    (reason: PopoverOpenChangeReason = "none", event?: Event) => {
      selected.current = reason === "item-press";
      queueMicrotask(() => setOpen(false, reason, event));
    },
    [setOpen],
  );
  return React.useMemo<PopoverState>(() => ({ open, setOpen, close, closeOnSelect, selected }), [open, setOpen, close, closeOnSelect]);
}

export function ContentFocus({ initialFocus, children }: { initialFocus?: PopoverInitialFocus; children: React.ReactNode }) {
  const { state } = usePopoverInternals("Content");
  const focusGrid = initialFocus === undefined;
  const value = React.useMemo(() => ({ ...state, focusGrid }), [state, focusGrid]);
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

export function PopoverProvider({ value, children }: { value: PopoverInternals; children: React.ReactNode }) {
  return (
    <PopoverContext.Provider value={value.state}>
      <InternalsContext.Provider value={value}>{children}</InternalsContext.Provider>
    </PopoverContext.Provider>
  );
}

export const Trigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(function Trigger({ render, className, style, children, ...props }, ref) {
  const { state, setTrigger, triggerProps } = usePopoverInternals("Trigger");
  const toggle = (e: React.MouseEvent) => !e.defaultPrevented && state.setOpen(!state.open, "trigger-press", e.nativeEvent);
  const refs = React.useMemo(() => mergeRefs<HTMLButtonElement>(setTrigger, ref), [setTrigger, ref]);
  const interaction = useInteraction(props.disabled);
  const merged = triggerProps(
    mergeProps(
      { type: render ? undefined : "button" },
      props,
      { "aria-haspopup": "dialog", "aria-expanded": state.open, "data-slot": SLOTS.popoverTrigger, "data-popup-open": state.open ? "" : undefined, onClick: toggle },
      interaction.props,
    ),
  );
  return renderElement("button", { ...merged, ref: refs, render, className, style, children }, { ...interaction.state, open: state.open });
});
