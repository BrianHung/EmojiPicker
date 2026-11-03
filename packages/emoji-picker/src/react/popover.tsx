// An unstyled popover for pickers: a trigger and portaled content positioned next to
// it by Floating UI (flips, shifts into the viewport, follows scroll and resize),
// Escape and outside-click to close, focus in on open and back to the trigger on
// close, close-on-pick for any EmojiPicker.Root inside, and enter/exit hooks for CSS
// transitions (data-starting-style / data-ending-style, --transform-origin).
import * as React from "react";
import { createPortal } from "react-dom";
import { autoUpdate, flip, offset, shift, size, useFloating, type Placement, type VirtualElement } from "@floating-ui/react-dom";

type Side = "top" | "bottom";
type Align = "start" | "center" | "end";
type AnchorRect = { top: number; left: number; right: number; bottom: number; width: number; height: number; x?: number; y?: number };
/** Anything with a rect: an element, a virtual element, or a function returning the rect (an editor caret). */
export type PopoverAnchor = { getBoundingClientRect(): AnchorRect } | (() => AnchorRect | null | undefined);

type PopoverState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
  closeOnSelect: boolean;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
};

const PopoverContext = React.createContext<PopoverState | null>(null);
/** Open state of the nearest EmojiPopover, for custom triggers and contents. */
export const useEmojiPopover = () => React.useContext(PopoverContext);

/** Content elements of open popovers below this one: clicks there are not "outside". */
const NestedContext = React.createContext<((node: HTMLElement | null) => () => void) | null>(null);

export type PopoverRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Close when a picker inside picks an emoji. Default true. */
  closeOnSelect?: boolean;
  children: React.ReactNode;
};

function Root({ open: controlled, defaultOpen = false, onOpenChange, closeOnSelect = true, children }: PopoverRootProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentId = React.useId();
  // Stable across renders, so an inline onOpenChange doesn't re-run the content's effects.
  const latest = React.useRef({ controlled, onOpenChange });
  latest.current = { controlled, onOpenChange };
  const setOpen = React.useCallback((next: boolean) => {
    if (latest.current.controlled === undefined) setUncontrolled(next);
    latest.current.onOpenChange?.(next);
  }, []);
  const close = React.useCallback(() => setOpen(false), [setOpen]);
  const value = React.useMemo<PopoverState>(() => ({ open, setOpen, close, closeOnSelect, triggerRef, contentId }), [open, setOpen, close, closeOnSelect, contentId]);
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

function useRequired(part: string) {
  const state = React.useContext(PopoverContext);
  if (!state) throw new Error(`EmojiPopover.${part} must be inside EmojiPopover.Root`);
  return state;
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.MutableRefObject<T>).current = value;
}

export type PopoverTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Render your own element (a shadcn Button…) as the trigger; it receives the props. */
  asChild?: boolean;
};

const Trigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(function Trigger({ asChild, onClick, children, ...props }, ref) {
  const state = useRequired("Trigger");
  const triggerProps = {
    ...props,
    "aria-haspopup": "dialog" as const,
    "aria-expanded": state.open,
    "aria-controls": state.open ? state.contentId : undefined,
    "data-slot": "popover-trigger",
    "data-state": state.open ? "open" : "closed",
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) state.setOpen(!state.open);
    },
  };
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown> & { ref?: React.Ref<HTMLElement> }>;
    return React.cloneElement(child, {
      ...triggerProps,
      ...child.props,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        (child.props.onClick as ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e);
        triggerProps.onClick(e);
      },
      ref: (node: HTMLElement | null) => {
        state.triggerRef.current = node;
        setRef(ref as React.Ref<HTMLElement>, node);
        setRef(child.props.ref, node);
      },
    });
  }
  return (
    <button
      type="button"
      {...triggerProps}
      ref={(node) => {
        state.triggerRef.current = node;
        setRef(ref, node);
      }}
    >
      {children}
    </button>
  );
});

/** Where focus goes when the content opens. */
export type PopoverInitialFocus = React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | false;

export type PopoverContentProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Preferred side; flips when there's no room. Default "bottom". */
  side?: Side;
  align?: Align;
  /** Gap to the trigger, px. Default 8. */
  sideOffset?: number;
  /** Distance kept from the viewport edges, px. Default 8. */
  collisionPadding?: number;
  /** Portal into this element; default document.body. `false` renders in place. */
  container?: HTMLElement | false;
  /**
   * Position against this instead of the Trigger: an element, a virtual element
   * (`{ getBoundingClientRect }`) or a function, e.g. a rich-text editor's caret rect.
   * Root then works without a Trigger; drive it with `open` / `onOpenChange`.
   */
  anchor?: PopoverAnchor;
  /**
   * Focused once the content is positioned and visible. Default: `pickerInitialFocus`
   * (a picker's search field when it autofocuses, else its current emoji), else the
   * first thing Tab stops on. `false` leaves focus where it is (an editor's caret).
   */
  initialFocus?: PopoverInitialFocus;
};

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
  const target = root.querySelector<HTMLElement>('[data-autofocus]') ?? root.querySelector<HTMLElement>('[data-slot="emoji-picker"] [data-slot="list"] [data-slot="emoji"][tabindex="0"]');
  if (target) return target;
  // A picker whose grid hasn't rendered yet: nothing to focus yet (call again once it has).
  if (root.querySelector('[data-slot="emoji-picker"] [data-slot="list"]') || root.matches('[data-slot="emoji-picker"]')) return null;
  return tabbables(root)[0] ?? null;
}

/**
 * Mount and enter/exit state. Content mounts with "starting" (one frame, so CSS
 * transitions have a start), is "idle" while open, and "ending" until its exit
 * animations finish; reopening during the exit reverses it in place.
 */
type TransitionStatus = "starting" | "idle" | "ending";

function useTransition(open: boolean) {
  const [mounted, setMounted] = React.useState(open);
  const [status, setStatus] = React.useState<TransitionStatus>(open ? "starting" : "idle");
  // Derived during render (no extra commit): open mounts, close starts the exit.
  if (open && !mounted) {
    setMounted(true);
    setStatus("starting");
  } else if (!open && mounted && status !== "ending") setStatus("ending");
  else if (open && status === "ending") setStatus("idle");
  return { mounted, status, setStatus, unmount: React.useCallback(() => setMounted(false), []) };
}

/** Resolves when the element's running transitions and animations end (at once when there are none). */
function motionFinished(el: HTMLElement, done: () => void): () => void {
  let cancelled = false;
  const finish = () => !cancelled && done();
  const animations = typeof el.getAnimations === "function" ? el.getAnimations() : [];
  if (!animations.length) finish();
  else void Promise.allSettled(animations.map((a) => a.finished)).then(finish);
  return () => void (cancelled = true);
}

const placementOf = (side: Side, align: Align): Placement => (align === "center" ? side : `${side}-${align}`);

const Content = React.forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  { side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, container, anchor, initialFocus, style, children, ...props },
  ref,
) {
  const state = useRequired("Content");
  const { mounted, status, setStatus, unmount } = useTransition(state.open);
  const node = React.useRef<HTMLDivElement | null>(null);
  const nested = React.useRef(new Set<HTMLElement>());
  const registerInParent = React.useContext(NestedContext);
  const anchorRef = React.useRef(anchor);
  anchorRef.current = anchor;
  const initialFocusRef = React.useRef(initialFocus);
  initialFocusRef.current = initialFocus;

  // The anchor as Floating UI's reference: the Trigger, or a virtual element over `anchor`.
  const [reference] = React.useState<VirtualElement>(() => ({
    getBoundingClientRect: () => {
      const a = anchorRef.current;
      const rect = (typeof a === "function" ? a() : a?.getBoundingClientRect()) ?? state.triggerRef.current?.getBoundingClientRect();
      const { top = 0, left = 0, right = 0, bottom = 0, width = 0, height = 0 } = rect ?? {};
      return { x: left, y: top, top, left, right, bottom, width, height } as DOMRect;
    },
    get contextElement() {
      const a = anchorRef.current;
      return a instanceof Element ? a : typeof a === "function" ? undefined : (state.triggerRef.current ?? undefined);
    },
  }));
  const floating = useFloating({
    open: mounted,
    strategy: "fixed",
    placement: placementOf(side, align),
    transform: false,
    elements: { reference: mounted ? reference : null },
    // Follows scroll and resizes, not the anchor's own transitions (a trigger's press scale).
    whileElementsMounted: (reference, floating, update) => autoUpdate(reference, floating, update, { layoutShift: false }),
    middleware: [
      offset(sideOffset),
      flip({ padding: collisionPadding, fallbackStrategy: "initialPlacement", crossAxis: false }),
      shift({ padding: collisionPadding, crossAxis: true }),
      size({
        padding: collisionPadding,
        apply({ availableWidth, availableHeight, elements }) {
          elements.floating.style.setProperty("--available-width", `${Math.round(availableWidth)}px`);
          elements.floating.style.setProperty("--available-height", `${Math.round(availableHeight)}px`);
        },
      }),
    ],
  });
  const positioned = mounted && floating.isPositioned;
  const placedSide: Side = floating.placement.startsWith("top") ? "top" : "bottom";
  // Scale from the trigger: its center along the edge facing it.
  const origin = (() => {
    if (!positioned) return undefined;
    const r = reference.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2 - floating.x, 0), node.current?.offsetWidth ?? 0);
    const y = placedSide === "bottom" ? r.bottom - floating.y : r.top - floating.y;
    return `${Math.round(x)}px ${Math.round(y)}px`;
  })();

  // Children popovers register their content so clicks inside them stay "inside".
  const register = React.useCallback((el: HTMLElement | null) => {
    if (!el) return () => {};
    nested.current.add(el);
    return () => void nested.current.delete(el);
  }, []);
  React.useLayoutEffect(() => (state.open && registerInParent ? registerInParent(node.current) : undefined), [state.open, registerInParent]);

  // Enter: one frame with data-starting-style (positioning flushed style with it applied, so the transition has a start), then idle.
  React.useLayoutEffect(() => {
    if (status !== "starting" || !positioned) return;
    const frame = requestAnimationFrame(() => setStatus("idle"));
    return () => cancelAnimationFrame(frame);
  }, [status, positioned, setStatus]);

  // Exit: unmount once the ending-style transitions finish.
  React.useLayoutEffect(() => {
    if (status !== "ending" || !node.current) return;
    return motionFinished(node.current, unmount);
  }, [status, unmount]);

  // Focus in once visible: a hidden element can't take focus, so autofocus during the measuring render is lost.
  React.useLayoutEffect(() => {
    const el = node.current;
    if (!state.open || !positioned || !el || el.contains(document.activeElement)) return;
    const option = initialFocusRef.current;
    if (option === false) return;
    if (typeof option === "function" || option) {
      (typeof option === "function" ? option() : option.current)?.focus({ preventScroll: true });
      return;
    }
    const focusDefault = () => pickerInitialFocus(el)?.focus({ preventScroll: true });
    focusDefault();
    // The grid renders its rows after the popover is positioned, which can drop focus
    // to the body: until the user does something, put it back.
    const observer = new MutationObserver(() => {
      const active = document.activeElement;
      if (!el.contains(active) && (active === null || active === document.body || active === state.triggerRef.current)) focusDefault();
    });
    observer.observe(el, { childList: true, subtree: true });
    const stop = () => observer.disconnect();
    document.addEventListener("keydown", stop, true);
    document.addEventListener("pointerdown", stop, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", stop, true);
      document.removeEventListener("pointerdown", stop, true);
    };
  }, [state.open, positioned]);

  // Focus back to the trigger when it closes (not on unrelated re-renders).
  const wasOpen = React.useRef(state.open);
  React.useLayoutEffect(() => {
    if (wasOpen.current && !state.open) {
      const active = document.activeElement;
      if (node.current?.contains(active) || active === document.body || active == null) state.triggerRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = state.open;
  }, [state.open, state.triggerRef]);

  // Escape and outside clicks close. A picker inside handles its own Escape (its keymap's "close").
  const { close, triggerRef } = state;
  React.useEffect(() => {
    if (!state.open) return;
    const inside = (target: EventTarget | null) => target instanceof Node && (node.current?.contains(target) || triggerRef.current?.contains(target) || [...nested.current].some((n) => n.contains(target)));
    const down = (e: PointerEvent) => !inside(e.target) && close();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !e.defaultPrevented && !nested.current.size) return tabOut(e);
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Only the innermost open popover handles Escape.
      if (nested.current.size) return;
      if (e.target instanceof Element && node.current?.contains(e.target) && e.target.closest('[data-slot="emoji-picker"]')) return;
      e.preventDefault();
      close();
    };
    // The content is portaled (at the end of the page): Tab past either end goes back
    // to where the trigger is in the page, as if the content followed it, and closes.
    const tabOut = (e: KeyboardEvent) => {
      const el = node.current;
      const trigger = triggerRef.current;
      if (!el || !trigger || !(e.target instanceof Element) || !el.contains(e.target)) return;
      const stops = tabbables(el);
      if (e.shiftKey ? e.target !== stops[0] : e.target !== stops[stops.length - 1]) return;
      e.preventDefault();
      const next = e.shiftKey ? trigger : (tabbables(document.body).find((t) => !el.contains(t) && trigger.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING && !trigger.contains(t)) ?? trigger);
      next.focus();
      close();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [state.open, close, triggerRef]);

  // An exiting popover can't be clicked or focused.
  React.useLayoutEffect(() => {
    if (node.current) node.current.inert = status === "ending";
  }, [status, mounted]);

  if (!mounted) return null;
  const transitionAttrs = status === "starting" ? { "data-starting-style": "" } : status === "ending" ? { "data-ending-style": "" } : {};
  const content = (
    <div
      {...props}
      ref={(el) => {
        node.current = el;
        setRef(ref, el);
        floating.refs.setFloating(el);
      }}
      id={state.contentId}
      role="dialog"
      // A dialog needs a name; pass aria-label or aria-labelledby for another.
      aria-label={props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Emoji picker")}
      data-slot="popover-content"
      data-state={state.open ? "open" : "closed"}
      data-side={positioned ? placedSide : side}
      data-align={align}
      {...transitionAttrs}
      style={
        {
          position: "fixed",
          zIndex: 50,
          top: positioned ? floating.y : 0,
          left: positioned ? floating.x : 0,
          visibility: positioned ? undefined : "hidden",
          "--transform-origin": origin,
          ...style,
        } as React.CSSProperties
      }
    >
      <NestedContext.Provider value={register}>{children}</NestedContext.Provider>
    </div>
  );
  if (container === false || typeof document === "undefined") return content;
  return createPortal(content, container ?? document.body);
});

/** Elements Tab stops on under `root`, in document order. */
function tabbables(root: Element): HTMLElement[] {
  const candidates = root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex], [contenteditable="true"]');
  return [...candidates].filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && !el.closest("[inert]") && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
}

/** Popover for pickers: `<EmojiPopover.Root><EmojiPopover.Trigger/><EmojiPopover.Content>…</EmojiPopover.Content></EmojiPopover.Root>`. */
export const EmojiPopover = { Root, Trigger, Content };
