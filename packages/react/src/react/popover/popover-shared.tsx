import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { createChangeDetails } from "@brianhung/emoji-picker-core/internal";
import { PopoverContext, type EmojiPopoverInteractionType, type EmojiPopoverRootChangeEventDetails, type EmojiPopoverRootChangeEventReason, type PopoverState } from "./popover-context";
import { useEmojiLabels } from "../provider/provider";
import { mergePartProps } from "../utils/events";
import { useLatest } from "../utils/latest";
import { useChangeState } from "../utils/state";
import { flag, renderElement, type EmojiPickerInteractionState, type EmojiPickerPartElementProps } from "../utils/render";
import { useInteraction, type Clickable } from "../utils/interaction";
import { SLOTS } from "../utils/slots";
import { TABBABLE, useLayoutEffect } from "../utils/utils";

export type EmojiPopoverSide = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
export type EmojiPopoverAlign = "start" | "center" | "end";

type Physical = "top" | "bottom" | "left" | "right";

export const physicalSide = (side: EmojiPopoverSide, rtl: boolean): Physical => (side === "inline-start" ? (rtl ? "right" : "left") : side === "inline-end" ? (rtl ? "left" : "right") : side);

// The side the positioner placed the content on, in the terms it was asked for: a flipped inline-start reports inline-end
export const placedSide = (side: EmojiPopoverSide, placed: string | null | undefined, rtl: boolean): EmojiPopoverSide =>
  !placed || placed === physicalSide(side, rtl) ? side : side === "inline-start" ? "inline-end" : side === "inline-end" ? "inline-start" : (placed as Physical);
export type PopoverAnchorRect = { top: number; left: number; width: number; height: number };
type VirtualAnchor = { getBoundingClientRect(): PopoverAnchorRect };
export type EmojiPopoverAnchor = Element | VirtualAnchor | React.RefObject<Element | null> | (() => Element | VirtualAnchor | PopoverAnchorRect | null | undefined) | null;

const resolveAnchor = (anchor: EmojiPopoverAnchor | undefined) => (typeof anchor === "function" ? anchor() : anchor && "current" in anchor ? anchor.current : anchor);

export const anchorElement = (anchor: EmojiPopoverAnchor | undefined) => {
  const target = resolveAnchor(anchor);
  return target instanceof Element ? target : null;
};

export const anchorRect = (anchor: EmojiPopoverAnchor | undefined) => {
  const target = resolveAnchor(anchor);
  const r = target && "getBoundingClientRect" in target ? target.getBoundingClientRect() : target;
  return r ? new DOMRect(r.left, r.top, r.width, r.height) : undefined;
};

export type { EmojiPopoverInteractionType, EmojiPopoverRootChangeEventDetails, EmojiPopoverRootChangeEventReason };

export type EmojiPopoverRootActions = { close(): void };

export type EmojiPopoverRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: EmojiPopoverRootChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  actionsRef?: React.Ref<EmojiPopoverRootActions>;
  modal?: boolean;
  children: React.ReactNode;
};

export type EmojiPopoverTriggerState = EmojiPickerInteractionState & { open: boolean };

export type EmojiPopoverTriggerProps = EmojiPickerPartElementProps<EmojiPopoverTriggerState, HTMLButtonElement> & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "name" | "value">;

export type EmojiPopoverInitialFocus = boolean | React.RefObject<HTMLElement | null> | ((openType: EmojiPopoverInteractionType) => HTMLElement | boolean | null | undefined);
export type EmojiPopoverFinalFocus = boolean | React.RefObject<HTMLElement | null> | ((closeType: EmojiPopoverInteractionType) => HTMLElement | boolean | null | undefined);
export type EmojiPopoverContainer = HTMLElement | ShadowRoot | React.RefObject<HTMLElement | ShadowRoot | null> | null;

export type EmojiPopoverPortalProps = {
  container?: EmojiPopoverContainer;
  children?: React.ReactNode;
};

export type EmojiPopoverPositionerState = { open: boolean; side: EmojiPopoverSide; align: EmojiPopoverAlign };

export type EmojiPopoverPositionerProps = EmojiPickerPartElementProps<EmojiPopoverPositionerState> & {
  side?: EmojiPopoverSide;
  align?: EmojiPopoverAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  anchor?: EmojiPopoverAnchor;
};

export type Placement = Required<Pick<EmojiPopoverPositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding">>;

export type EmojiPopoverPopupState = EmojiPopoverPositionerState & { transitionStatus: "starting" | "ending" | "idle" | undefined };

export type EmojiPopoverPopupProps = EmojiPickerPartElementProps<EmojiPopoverPopupState> & {
  initialFocus?: EmojiPopoverInitialFocus;
  finalFocus?: EmojiPopoverFinalFocus;
};

export type EmojiSuggestionsRootProps = {
  open: boolean;
  onOpenChange?: (open: boolean, details: EmojiPopoverRootChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  children: React.ReactNode;
};

export type EmojiSuggestionsPortalProps = EmojiPopoverPortalProps;

export type EmojiSuggestionsPositionerState = EmojiPopoverPositionerState;

export type EmojiSuggestionsPositionerProps = Omit<EmojiPopoverPositionerProps, "anchor"> & { anchor: EmojiPopoverAnchor };

export type EmojiSuggestionsPopupState = EmojiPopoverPopupState;

export type EmojiSuggestionsPopupProps = EmojiPickerPartElementProps<EmojiSuggestionsPopupState>;

// For popovers this package doesn't render, so all it has is their content element
export function pickerInitialFocus(root: Element | null | undefined): HTMLElement | null {
  if (!root) return null;
  const target = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"] [data-slot="${SLOTS.emoji}"][tabindex="0"]`);
  if (target) return target;
  if (root.querySelector(`[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"]`) || root.matches(`[data-slot="${SLOTS.root}"]`)) return null;
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].find((el) => el.tabIndex >= 0) ?? null;
}

export const containerOf = (container: EmojiPopoverContainer | undefined) => (container ? ("current" in container ? container.current : container) : null) ?? undefined;

const interactionOf = (event?: Event): EmojiPopoverInteractionType => {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (!(event instanceof MouseEvent)) return "";
  const pointer = (event as Partial<PointerEvent>).pointerType as EmojiPopoverInteractionType | undefined;
  return pointer || (event.detail === 0 && event.type === "click" ? "keyboard" : "mouse");
};

// Base UI's focus props: true or null keeps the default, false or nothing leaves focus where it is
const resolveFocus = (focus: EmojiPopoverInitialFocus | EmojiPopoverFinalFocus | undefined, type: EmojiPopoverInteractionType): HTMLElement | boolean => {
  if (focus === undefined || typeof focus === "boolean") return focus ?? true;
  const target = typeof focus === "function" ? focus(type) : focus.current;
  return target === null || target === true ? true : target || false;
};

export function initialFocusTarget(state: PopoverState, initialFocus: EmojiPopoverInitialFocus | undefined, content: Element | null): HTMLElement | false | null {
  const target = resolveFocus(initialFocus, state.interaction.current);
  state.focusGrid.current = target === true;
  return target === true ? pickerInitialFocus(content) : target;
}

export const finalFocusTarget = (state: PopoverState, finalFocus: EmojiPopoverFinalFocus | undefined) => resolveFocus(finalFocus, state.interaction.current);

export type TransitionStatus = NonNullable<EmojiPopoverPopupState["transitionStatus"]>;

const openAttributes = (open: boolean) => ({ "data-open": flag(open), "data-closed": flag(!open) });

export const positionerAttributes = ({ open, side, align }: EmojiPopoverPositionerState, slot: string) => ({
  role: "presentation",
  "data-slot": slot,
  ...openAttributes(open),
  "data-side": side,
  "data-align": align,
});

export const popupAttributes = ({ open, side, align, transitionStatus }: EmojiPopoverPopupState) => ({
  ...openAttributes(open),
  "data-side": side,
  "data-align": align,
  "data-starting-style": flag(transitionStatus === "starting"),
  "data-ending-style": flag(transitionStatus === "ending"),
});

export const closedPointerEvents = (open: boolean): React.CSSProperties | undefined => (open ? undefined : { pointerEvents: "none" });

export function usePopupAttributes(props: React.AriaAttributes) {
  const { picker } = useEmojiLabels();
  return { role: "dialog", "aria-label": props["aria-label"] ?? (props["aria-labelledby"] ? undefined : picker), "data-slot": SLOTS.popoverPopup };
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

export function usePopoverState({ open: controlled, defaultOpen = false, onOpenChange, onOpenChangeComplete, actionsRef }: Omit<EmojiPopoverRootProps, "children" | "modal">, trigger: HTMLElement | null) {
  const [open, setState] = useChangeState(controlled, defaultOpen, onOpenChange);
  const interaction = React.useRef<EmojiPopoverInteractionType>("");
  const focusGrid = React.useRef(false);
  const setOpen = React.useCallback(
    (next: boolean, reason: EmojiPopoverRootChangeEventReason, event?: Event) => {
      interaction.current = interactionOf(event);
      setState(next, createChangeDetails(reason, event, trigger?.isConnected ? trigger : undefined));
    },
    [setState, trigger],
  );
  // After the task's microtasks, so an editor focused in onSelect (Lexical updates in a microtask) keeps focus
  const close = React.useCallback((reason: EmojiPopoverRootChangeEventReason = "none", event?: Event) => queueMicrotask(() => setOpen(false, reason, event)), [setOpen]);
  React.useImperativeHandle(actionsRef, () => ({ close: () => setOpen(false, "imperative-action") }), [setOpen]);
  return React.useMemo<PopoverState>(() => ({ open, setOpen, close, interaction, focusGrid, complete: onOpenChangeComplete }), [open, setOpen, close, onOpenChangeComplete]);
}

// Base UI's approach: entering for one frame, and mounted until the content's CSS animations and transitions finish
export function useTransition(open: boolean, node: React.RefObject<HTMLElement | null>, complete?: (open: boolean) => void) {
  const [status, setStatus] = React.useState<TransitionStatus | null>(open ? "idle" : null);
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
        setStatus("idle");
        settle("idle");
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
