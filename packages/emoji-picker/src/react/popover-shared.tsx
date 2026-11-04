import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { PopoverContext, type PopoverState } from "./popover-context";

export { useEmojiPopover } from "./popover-context";

export type Side = "top" | "bottom";
export type Align = "start" | "center" | "end";
type AnchorRect = { top: number; left: number; width: number; height: number };
/** Anything with a rect: an element, a virtual element, or a function returning the rect (an editor caret). */
export type PopoverAnchor = { getBoundingClientRect(): AnchorRect } | (() => AnchorRect | null | undefined);

export const anchorRect = (anchor: PopoverAnchor | undefined) => {
  const r = typeof anchor === "function" ? anchor() : anchor?.getBoundingClientRect();
  return r ? new DOMRect(r.left, r.top, r.width, r.height) : undefined;
};

export type PopoverRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Close when a picker inside picks an emoji. Default true. */
  closeOnSelect?: boolean;
  children: React.ReactNode;
};

export type PopoverTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Render your own element (a shadcn Button…) as the trigger; it receives the props. */
  asChild?: boolean;
};

/** Where focus goes when the content opens. */
export type PopoverInitialFocus = React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | false;

export type PopoverPlacementProps = {
  /** Preferred side; flips when there's no room. Default "bottom". */
  side?: Side;
  align?: Align;
  /** Gap to the anchor, px. */
  sideOffset?: number;
  /** Distance kept from the viewport edges, px. Default 8. */
  collisionPadding?: number;
  /** Portal into this element; default document.body. `false` renders in place. */
  container?: HTMLElement | false;
};

export type PopoverContentProps = React.HTMLAttributes<HTMLDivElement> &
  PopoverPlacementProps & {
    /**
     * Position against this instead of the Trigger: an element, a virtual element
     * (`{ getBoundingClientRect }`) or a function, e.g. a rich-text editor's caret rect.
     * Root then works without a Trigger; drive it with `open` / `onOpenChange`.
     */
    anchor?: PopoverAnchor;
    /**
     * Focused once the content opens. Default: `pickerInitialFocus` (a picker's search field
     * when it autofocuses, else its current emoji), else the first thing Tab stops on.
     * `false` leaves focus where it is.
     */
    initialFocus?: PopoverInitialFocus;
  };

/** A `:shortcode` menu next to a text field's caret: never takes focus, so the field keeps its caret and IME. */
export type SuggestionsPopoverProps = React.HTMLAttributes<HTMLDivElement> &
  PopoverPlacementProps & {
    open: boolean;
    /** Called with false on a press outside. */
    onOpenChange?: (open: boolean) => void;
    /** Usually the caret's rect: `() => editor.view.coordsAtPos(…)`, a Tiptap suggestion's `clientRect`. */
    anchor: PopoverAnchor;
  };

const TABBABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/**
 * Where focus belongs when a picker opens in any popover (EmojiPopover, Base UI, Radix):
 * its search field when it autofocuses, else the grid's tab stop (its current emoji),
 * else the first thing Tab stops on.
 *
 *   <Popover.Popup initialFocus={() => pickerInitialFocus(popupRef.current)}>   // Base UI
 *   <Popover.Content onOpenAutoFocus={(e) => { e.preventDefault(); pickerInitialFocus(e.currentTarget)?.focus(); }}>   // Radix
 */
export function pickerInitialFocus(root: Element | null | undefined): HTMLElement | null {
  if (!root) return null;
  const target = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>('[data-slot="emoji-picker"] [data-slot="list"] [data-slot="emoji"][tabindex="0"]');
  if (target) return target;
  // A picker whose grid hasn't rendered yet: nothing to focus yet.
  if (root.querySelector('[data-slot="emoji-picker"] [data-slot="list"]') || root.matches('[data-slot="emoji-picker"]')) return null;
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].find((el) => el.tabIndex >= 0) ?? null;
}

export const initialFocusTarget = (initialFocus: PopoverInitialFocus | undefined, content: Element | null) =>
  (initialFocus === false ? null : typeof initialFocus === "function" ? initialFocus() : initialFocus ? initialFocus.current : pickerInitialFocus(content)) ?? null;

export type TransitionStatus = "starting" | "open" | "ending";

/** The attributes every adapter puts on the content, so styles and tests don't depend on the adapter. */
export const contentAttributes = ({ open, side, align, status, props }: { open: boolean; side: string; align: Align; status: TransitionStatus; props: React.AriaAttributes }) => ({
  role: "dialog",
  // A dialog needs a name; pass aria-label or aria-labelledby for another.
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
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  // Stable across renders, so an inline onOpenChange doesn't re-run effects that depend on it.
  const latest = React.useRef({ controlled, onOpenChange });
  latest.current = { controlled, onOpenChange };
  const setOpen = React.useCallback((next: boolean) => {
    if (latest.current.controlled === undefined) setUncontrolled(next);
    latest.current.onOpenChange?.(next);
  }, []);
  // After the task's microtasks: an editor an app focuses in onSelect (Lexical updates in a microtask) keeps focus.
  const close = React.useCallback(() => queueMicrotask(() => setOpen(false)), [setOpen]);
  return React.useMemo<PopoverState>(() => ({ open, setOpen, close, closeOnSelect }), [open, setOpen, close, closeOnSelect]);
}

/** Wraps the content's children: a picker whose grid renders after opening focuses it, unless `initialFocus` is set. */
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

export const Trigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(function Trigger({ asChild, children, ...props }, ref) {
  const { state, setTrigger, triggerProps } = usePopoverInternals("Trigger");
  const toggle = (e: React.MouseEvent) => !e.defaultPrevented && state.setOpen(!state.open);
  const childRef = asChild && React.isValidElement(children) ? (children.props as { ref?: React.Ref<HTMLElement> }).ref : undefined;
  const refs = React.useMemo(() => mergeRefs(setTrigger, ref as React.Ref<HTMLElement>, childRef) as React.Ref<HTMLButtonElement>, [setTrigger, ref, childRef]);
  const merged = triggerProps(mergeProps(props, { "aria-haspopup": "dialog", "aria-expanded": state.open, "data-slot": "popover-trigger", "data-state": state.open ? "open" : "closed", onClick: toggle }));
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, { ...mergeProps(child.props, merged), ref: refs });
  }
  return (
    <button type="button" {...merged} ref={refs}>
      {children}
    </button>
  );
});
