import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { createChangeDetails } from "@brianhung/emoji-picker-core/internal";
import { PopoverContext, type EmojiPopoverRootChangeEventDetails, type EmojiPopoverRootChangeEventReason, type PopoverState } from "./popover-context";
import { useEmojiLabels } from "../provider/provider";
import { mergePartProps, type EmojiPickerHandlers } from "../utils/events";
import { useLatest } from "../utils/latest";
import { useChangeState } from "../utils/state";
import { flag, renderElement, type EmojiPickerInteractionState, type EmojiPickerPartElementProps, type EmojiPickerPartProps } from "../utils/render";
import { useInteraction, type Clickable } from "../utils/interaction";
import { SLOTS } from "../utils/slots";
import { TABBABLE, useLayoutEffect } from "../utils/utils";

export type PopoverSide = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
export type PopoverAlign = "start" | "center" | "end";

type Physical = "top" | "bottom" | "left" | "right";

export const physicalSide = (side: PopoverSide, rtl: boolean): Physical => (side === "inline-start" ? (rtl ? "right" : "left") : side === "inline-end" ? (rtl ? "left" : "right") : side);

// The side the positioner placed the content on, in the terms it was asked for: a flipped inline-start reports inline-end
export const placedSide = (side: PopoverSide, placed: string | null | undefined, rtl: boolean): PopoverSide =>
  !placed || placed === physicalSide(side, rtl) ? side : side === "inline-start" ? "inline-end" : side === "inline-end" ? "inline-start" : (placed as Physical);
export type PopoverAnchorRect = { top: number; left: number; width: number; height: number };
export type EmojiPopoverAnchor = { getBoundingClientRect(): PopoverAnchorRect } | (() => PopoverAnchorRect | null | undefined);

export const anchorRect = (anchor: EmojiPopoverAnchor | undefined) => {
  const r = typeof anchor === "function" ? anchor() : anchor?.getBoundingClientRect();
  return r ? new DOMRect(r.left, r.top, r.width, r.height) : undefined;
};

export type { EmojiPopoverRootChangeEventDetails, EmojiPopoverRootChangeEventReason };

export type EmojiPopoverRootActions = { close(): void };

export type EmojiPopoverRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: EmojiPopoverRootChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  actionsRef?: React.Ref<EmojiPopoverRootActions>;
  modal?: boolean;
  closeOnSelect?: boolean;
  children: React.ReactNode;
};

export type EmojiPopoverTriggerState = EmojiPickerInteractionState & { open: boolean };

export type EmojiPopoverTriggerProps = EmojiPickerPartElementProps<EmojiPopoverTriggerState, HTMLButtonElement> & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "name" | "value">;

export type EmojiPopoverInitialFocus = React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | false;
export type EmojiPopoverFinalFocus = HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

export type EmojiPopoverPlacementProps = {
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
  collisionPadding?: number;
  container?: HTMLElement | false;
};

export type EmojiPopoverContentState = { open: boolean; side: PopoverSide; align: PopoverAlign };

export type EmojiPopoverContentProps = EmojiPickerHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "style">> &
  EmojiPickerPartProps<EmojiPopoverContentState, HTMLDivElement> &
  EmojiPopoverPlacementProps & {
    anchor?: EmojiPopoverAnchor;
    initialFocus?: EmojiPopoverInitialFocus;
    finalFocus?: EmojiPopoverFinalFocus;
  };

export type EmojiSuggestionsPopoverState = EmojiPopoverContentState;

export type EmojiSuggestionsPopoverProps = EmojiPickerPartElementProps<EmojiSuggestionsPopoverState> &
  EmojiPopoverPlacementProps & {
    open: boolean;
    onOpenChange?: (open: boolean, details: EmojiPopoverRootChangeEventDetails) => void;
    onOpenChangeComplete?: (open: boolean) => void;
    anchor: EmojiPopoverAnchor;
  };

// For popovers this package doesn't render, so all it has is their content element
export function pickerInitialFocus(root: Element | null | undefined): HTMLElement | null {
  if (!root) return null;
  const target = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"] [data-slot="${SLOTS.emoji}"][tabindex="0"]`);
  if (target) return target;
  if (root.querySelector(`[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"]`) || root.matches(`[data-slot="${SLOTS.root}"]`)) return null;
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].find((el) => el.tabIndex >= 0) ?? null;
}

export const initialFocusTarget = (initialFocus: EmojiPopoverInitialFocus | undefined, content: Element | null) =>
  (initialFocus === false ? null : typeof initialFocus === "function" ? initialFocus() : initialFocus ? initialFocus.current : pickerInitialFocus(content)) ?? null;

export const finalFocusTarget = (finalFocus: EmojiPopoverFinalFocus) => (typeof finalFocus === "function" ? finalFocus() : finalFocus instanceof HTMLElement ? finalFocus : finalFocus.current) ?? null;

export type TransitionStatus = "starting" | "open" | "ending";

export const stateAttributes = ({ open, side, align }: EmojiPopoverContentState, status: TransitionStatus) => ({
  "data-open": flag(open),
  "data-closed": flag(!open),
  "data-side": side,
  "data-align": align,
  "data-starting-style": flag(status === "starting"),
  "data-ending-style": flag(status === "ending"),
});

export function useContentAttributes(props: React.AriaAttributes) {
  const { picker } = useEmojiLabels();
  return { role: "dialog", "aria-label": props["aria-label"] ?? (props["aria-labelledby"] ? undefined : picker), "data-slot": SLOTS.popoverContent };
}

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

export function usePopoverState({ open: controlled, defaultOpen = false, onOpenChange, onOpenChangeComplete, actionsRef, closeOnSelect = true }: Omit<EmojiPopoverRootProps, "children" | "modal">) {
  const [open, setState] = useChangeState(controlled, defaultOpen, onOpenChange);
  const selected = React.useRef(false);
  const setOpen = React.useCallback(
    (next: boolean, reason: EmojiPopoverRootChangeEventReason, event?: Event) => {
      if (next) selected.current = false;
      setState(next, createChangeDetails(reason, event));
    },
    [setState],
  );
  // After the task's microtasks, so an editor focused in onSelect (Lexical updates in a microtask) keeps focus
  const close = React.useCallback(
    (reason: EmojiPopoverRootChangeEventReason = "none", event?: Event) => {
      selected.current = reason === "item-press";
      queueMicrotask(() => setOpen(false, reason, event));
    },
    [setOpen],
  );
  React.useImperativeHandle(actionsRef, () => ({ close: () => setOpen(false, "imperative-action") }), [setOpen]);
  return React.useMemo<PopoverState>(() => ({ open, setOpen, close, closeOnSelect, selected, complete: onOpenChangeComplete }), [open, setOpen, close, closeOnSelect, onOpenChangeComplete]);
}

// Base UI's approach: entering for one frame, and mounted until the content's CSS animations and transitions finish
export function useTransition(open: boolean, node: React.RefObject<HTMLElement | null>, complete?: (open: boolean) => void) {
  const [status, setStatus] = React.useState<TransitionStatus | null>(open ? "open" : null);
  const latest = useLatest(complete);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a transition starts on each change of open; status and the node are read as of that change
  useLayoutEffect(() => {
    if (!open && status === null) return;
    let live = true;
    const settle = (next: TransitionStatus | null) =>
      requestAnimationFrame(() =>
        Promise.all((node.current?.getAnimations?.() ?? []).map((a) => a.finished))
          .catch(() => {})
          .then(() => {
            if (!live) return;
            if (next === null) setStatus(null);
            latest.current?.(open);
          }),
      );
    if (open) {
      setStatus("starting");
      const frame = requestAnimationFrame(() => {
        if (!live) return;
        setStatus("open");
        settle("open");
      });
      return () => {
        live = false;
        cancelAnimationFrame(frame);
      };
    }
    setStatus("ending");
    settle(null);
    return () => void (live = false);
  }, [open]);
  return status;
}

export function ContentFocus({ initialFocus, children }: { initialFocus?: EmojiPopoverInitialFocus; children: React.ReactNode }) {
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

export const Trigger = React.forwardRef<HTMLButtonElement, EmojiPopoverTriggerProps>(function Trigger({ render, className, style, children, ...props }, ref) {
  const { state, setTrigger, triggerProps } = usePopoverInternals("Trigger");
  const toggle = (e: React.MouseEvent) => state.setOpen(!state.open, "trigger-press", e.nativeEvent);
  const refs = React.useMemo(() => mergeRefs<HTMLButtonElement>(setTrigger, ref), [setTrigger, ref]);
  const { onClick, ...own } = mergePartProps<Clickable>(
    { type: render ? undefined : "button", ...props },
    { "aria-haspopup": "dialog", "aria-expanded": state.open, "data-slot": SLOTS.popoverTrigger, "data-popup-open": flag(state.open), onClick: toggle },
  );
  const interaction = useInteraction({ disabled: props.disabled, onClick });
  const merged = triggerProps(mergeProps(own, interaction.props));
  return renderElement("button", { ...merged, ref: refs, render, className, style, children }, { ...interaction.state, open: state.open });
});
