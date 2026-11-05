import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { useOverlayTriggerState } from "react-stately/useOverlayTriggerState";
import { PopoverContext, type PopoverState } from "./popover-context";
import { renderElement, type PartElementProps, type PartProps } from "../utils/render";
import { TABBABLE } from "../utils/utils";

export type Side = "top" | "bottom";
export type Align = "start" | "center" | "end";
type AnchorRect = { top: number; left: number; width: number; height: number };
export type PopoverAnchor = { getBoundingClientRect(): AnchorRect } | (() => AnchorRect | null | undefined);

export const anchorRect = (anchor: PopoverAnchor | undefined) => {
  const r = typeof anchor === "function" ? anchor() : anchor?.getBoundingClientRect();
  return r ? new DOMRect(r.left, r.top, r.width, r.height) : undefined;
};

export type PopoverRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnSelect?: boolean;
  children: React.ReactNode;
};

export type PopoverTriggerState = { open: boolean };

export type PopoverTriggerProps = PartElementProps<PopoverTriggerState, HTMLButtonElement> & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "name" | "value">;

export type PopoverInitialFocus = React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | false;
export type PopoverFinalFocus = HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

export type PopoverPlacementProps = {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  collisionPadding?: number;
  container?: HTMLElement | false;
};

export type PopoverContentState = { open: boolean; side: Side; align: Align };

export type PopoverContentProps = Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "style"> &
  Omit<PartProps<PopoverContentState>, "render"> &
  PopoverPlacementProps & {
    anchor?: PopoverAnchor;
    initialFocus?: PopoverInitialFocus;
    finalFocus?: PopoverFinalFocus;
  };

export type SuggestionsPopoverProps = React.HTMLAttributes<HTMLDivElement> &
  PopoverPlacementProps & {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    anchor: PopoverAnchor;
  };

// For popovers this package doesn't render, so all it has is their content element
export function pickerInitialFocus(root: Element | null | undefined): HTMLElement | null {
  if (!root) return null;
  const target = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>('[data-slot="emoji-picker"] [data-slot="list"] [data-slot="emoji"][tabindex="0"]');
  if (target) return target;
  if (root.querySelector('[data-slot="emoji-picker"] [data-slot="list"]') || root.matches('[data-slot="emoji-picker"]')) return null;
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].find((el) => el.tabIndex >= 0) ?? null;
}

export const initialFocusTarget = (initialFocus: PopoverInitialFocus | undefined, content: Element | null) =>
  (initialFocus === false ? null : typeof initialFocus === "function" ? initialFocus() : initialFocus ? initialFocus.current : pickerInitialFocus(content)) ?? null;

export const finalFocusTarget = (finalFocus: PopoverFinalFocus) => (typeof finalFocus === "function" ? finalFocus() : finalFocus instanceof HTMLElement ? finalFocus : finalFocus.current) ?? null;

type TransitionStatus = "starting" | "open" | "ending";

export const contentAttributes = ({ open, side, align, status, props }: PopoverContentState & { status: TransitionStatus; props: React.AriaAttributes }) => ({
  role: "dialog",
  "aria-label": props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Emoji picker"),
  "data-slot": "popover-content",
  "data-state": open ? "open" : "closed",
  "data-side": side,
  "data-align": align,
  "data-starting-style": status === "starting" ? "" : undefined,
  "data-ending-style": status === "ending" ? "" : undefined,
});

export type PopoverInternals = {
  state: PopoverState;
  trigger: HTMLElement | null;
  setTrigger: (el: HTMLElement | null) => void;
  triggerProps: (props: Record<string, unknown>) => Record<string, unknown>;
};

const InternalsContext = React.createContext<PopoverInternals | null>(null);

export function usePopoverInternals<T extends PopoverInternals>(part: string): T {
  const internals = React.useContext(InternalsContext);
  if (!internals) throw new Error(`EmojiPopover.${part} must be inside EmojiPopover.Root`);
  return internals as T;
}

export function usePopoverState({ open: controlled, defaultOpen = false, onOpenChange, closeOnSelect = true }: Omit<PopoverRootProps, "children">) {
  const overlay = useOverlayTriggerState({ isOpen: controlled, defaultOpen, onOpenChange });
  const { isOpen: open, setOpen: setOverlayOpen } = overlay;
  const selected = React.useRef(false);
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (next) selected.current = false;
      setOverlayOpen(next);
    },
    [setOverlayOpen],
  );
  // After the task's microtasks, so an editor focused in onSelect (Lexical updates in a microtask) keeps focus
  const close = React.useCallback(
    (reason?: "select") => {
      selected.current = reason === "select";
      queueMicrotask(() => setOpen(false));
    },
    [setOpen],
  );
  return React.useMemo<PopoverState>(() => ({ open, setOpen, close, closeOnSelect, selected, overlay }), [open, setOpen, close, closeOnSelect]);
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
  const toggle = (e: React.MouseEvent) => !e.defaultPrevented && state.setOpen(!state.open);
  const refs = React.useMemo(() => mergeRefs<HTMLButtonElement>(setTrigger, ref), [setTrigger, ref]);
  const merged = triggerProps(
    mergeProps({ type: render ? undefined : "button" }, props, { "aria-haspopup": "dialog", "aria-expanded": state.open, "data-slot": "popover-trigger", "data-state": state.open ? "open" : "closed", onClick: toggle }),
  );
  return renderElement("button", { ...merged, ref: refs, render, className, style, children }, { open: state.open });
});
