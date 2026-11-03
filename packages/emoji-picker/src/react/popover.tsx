// An unstyled popover for pickers: trigger, portaled content positioned next to it
// (flips, clamps to the viewport, follows scroll), Escape and outside-click to close,
// focus in on open and back to the trigger on close, close-on-pick for any
// EmojiPicker.Root inside, and enter/exit hooks for CSS transitions.
import * as React from "react";
import { createPortal } from "react-dom";

type Side = "top" | "bottom";
type AnchorRect = { top: number; left: number; right: number; bottom: number; width: number; height: number };
/** Anything with a rect: an element, a virtual element, or a function returning the rect (an editor caret). */
export type PopoverAnchor = { getBoundingClientRect(): AnchorRect } | (() => AnchorRect | null | undefined);
type Align = "start" | "center" | "end";

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
   * Focused once the content is positioned and visible. Default: the first
   * `[data-autofocus]` element inside (a picker's search field when the picker
   * autofocuses), else the picker's first emoji, else the first thing Tab stops on. `false` leaves focus where it is (an editor's caret).
   */
  initialFocus?: PopoverInitialFocus;
};

type Position = { top: number; left: number; side: Side; origin: string };

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

/** Longest transition or animation on an element, in ms (for browsers without getAnimations). */
function longestMotion(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const ms = (list: string) => list.split(",").map((v) => parseFloat(v) * (v.trim().endsWith("ms") ? 1 : 1000) || 0);
  const total = (durations: string, delays: string) => {
    const d = ms(durations);
    const l = ms(delays);
    return Math.max(0, ...d.map((x, i) => x + (l[i % l.length] ?? 0)));
  };
  return Math.max(total(cs.transitionDuration, cs.transitionDelay), total(cs.animationDuration, cs.animationDelay));
}

/** Resolves when the element's running transitions and animations end (at once when there are none). */
function motionFinished(el: HTMLElement, done: () => void): () => void {
  let cancelled = false;
  const finish = () => !cancelled && done();
  if (typeof el.getAnimations === "function") {
    // Reading animations flushes style, so the ending-style transitions exist by now.
    const animations = el.getAnimations();
    if (!animations.length) finish();
    else void Promise.allSettled(animations.map((a) => a.finished)).then(finish);
    return () => void (cancelled = true);
  }
  const timer = setTimeout(finish, longestMotion(el));
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

const Content = React.forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  { side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, container, anchor, initialFocus, style, children, ...props },
  ref,
) {
  const state = useRequired("Content");
  const { mounted, status, setStatus, unmount } = useTransition(state.open);
  const node = React.useRef<HTMLDivElement | null>(null);
  const nested = React.useRef(new Set<HTMLElement>());
  const registerInParent = React.useContext(NestedContext);
  const [position, setPosition] = React.useState<Position | null>(null);
  // Read through refs so new anchor/initialFocus values each render don't re-run effects.
  const anchorRef = React.useRef(anchor);
  anchorRef.current = anchor;
  const initialFocusRef = React.useRef(initialFocus);
  initialFocusRef.current = initialFocus;

  // Children popovers register their content so clicks inside them stay "inside".
  const register = React.useCallback((el: HTMLElement | null) => {
    if (!el) return () => {};
    nested.current.add(el);
    return () => void nested.current.delete(el);
  }, []);
  React.useLayoutEffect(() => (state.open && registerInParent ? registerInParent(node.current) : undefined), [state.open, registerInParent]);

  React.useLayoutEffect(() => {
    if (!mounted) return setPosition(null);
    let frame = 0;
    const update = () => {
      const a = anchorRef.current;
      const trigger = (typeof a === "function" ? a() : a?.getBoundingClientRect()) ?? state.triggerRef.current?.getBoundingClientRect();
      const el = node.current;
      if (!trigger || !el) return;
      // offsetWidth/Height: the layout size, unaffected by a scale transition in progress.
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = collisionPadding;
      const fitsBelow = trigger.bottom + sideOffset + height <= vh - pad;
      const fitsAbove = trigger.top - sideOffset - height >= pad;
      const below = side === "bottom" ? fitsBelow || !fitsAbove : !fitsAbove && fitsBelow;
      const x = align === "start" ? trigger.left : align === "end" ? trigger.right - width : trigger.left + trigger.width / 2 - width / 2;
      const left = Math.min(Math.max(x, pad), Math.max(pad, vw - width - pad));
      const top = Math.max(pad, Math.min(below ? trigger.bottom + sideOffset : trigger.top - sideOffset - height, vh - height - pad));
      // Scale from the trigger: its center along the edge facing it.
      const originX = Math.min(Math.max(trigger.left + trigger.width / 2 - left, 0), width);
      const originY = below ? trigger.bottom - top : trigger.top - top;
      const origin = `${Math.round(originX)}px ${Math.round(originY)}px`;
      setPosition((p) => (p && p.top === top && p.left === left && p.origin === origin && p.side === (below ? "bottom" : "top") ? p : { top, left, side: below ? "bottom" : "top", origin }));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (node.current) observer?.observe(node.current);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [mounted, state.triggerRef, side, align, sideOffset, collisionPadding]);

  const positioned = position != null;

  // Enter: one frame with data-starting-style (the position read above flushed
  // style with it applied, so the transition has a start), then idle.
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

  // Focus in once visible: a hidden element can't take focus, so autofocus during
  // the measuring render is lost.
  React.useLayoutEffect(() => {
    const el = node.current;
    if (!state.open || !positioned || !el || el.contains(document.activeElement)) return;
    const option = initialFocusRef.current;
    if (option === false) return;
    if (typeof option === "function" || option) {
      (typeof option === "function" ? option() : option.current)?.focus({ preventScroll: true });
      return;
    }
    // Default: the search field, or the first emoji when the picker has no search, so arrows work
    // at once. The grid renders (and re-renders) its cells after the popover is positioned, which
    // can drop focus to the body: while open, put it back.
    // Content that isn't a picker (a row of reactions): its first stop.
    const focusDefault = () => (el.querySelector<HTMLElement>('[data-autofocus], [data-slot="emoji-picker"] button[data-unified]') ?? tabbables(el)[0])?.focus({ preventScroll: true });
    focusDefault();
    // Only until the user does something: Tab past the content's end also leaves focus on the body.
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

  // Escape and outside clicks close. A picker inside handles its own keys (its
  // keymap's "close"), so Escape from inside one is left to it.
  const { close, triggerRef } = state;
  React.useEffect(() => {
    if (!state.open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (node.current?.contains(target) || triggerRef.current?.contains(target) || [...nested.current].some((n) => n.contains(target)));
    const down = (e: PointerEvent) => !inside(e.target) && close();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !e.defaultPrevented && !nested.current.size) return tabOut(e);
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Only the innermost open popover handles Escape.
      if (nested.current.size) return;
      if (e.target instanceof Element && node.current?.contains(e.target) && e.target.closest('[data-epr-part="root"]')) return;
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
      }}
      id={state.contentId}
      role="dialog"
      // A dialog needs a name; pass aria-label or aria-labelledby for another.
      aria-label={props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Emoji picker")}
      data-slot="popover-content"
      data-state={state.open ? "open" : "closed"}
      data-side={position?.side ?? side}
      data-align={align}
      {...transitionAttrs}
      style={
        {
          position: "fixed",
          zIndex: 50,
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          visibility: positioned ? undefined : "hidden",
          "--transform-origin": position?.origin,
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
