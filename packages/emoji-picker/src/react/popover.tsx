// An unstyled popover for pickers: trigger, portaled content positioned next to it
// (flips, clamps to the viewport, follows scroll), Escape and outside-click to close,
// focus back to the trigger, and close-on-pick for any EmojiPicker.Root inside.
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
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const value = React.useMemo<PopoverState>(() => ({ open, setOpen, close: () => setOpen(false), closeOnSelect, triggerRef, contentId }), [open, setOpen, closeOnSelect, contentId]);
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
};

const Content = React.forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  { side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, container, anchor, style, children, ...props },
  ref,
) {
  const state = useRequired("Content");
  const node = React.useRef<HTMLDivElement | null>(null);
  const nested = React.useRef(new Set<HTMLElement>());
  const registerInParent = React.useContext(NestedContext);
  const [position, setPosition] = React.useState<{ top: number; left: number; side: Side } | null>(null);
  // Read through a ref so a new anchor function each render doesn't re-run positioning.
  const anchorRef = React.useRef(anchor);
  anchorRef.current = anchor;

  // Children popovers register their content so clicks inside them stay "inside".
  const register = React.useCallback((el: HTMLElement | null) => {
    if (!el) return () => {};
    nested.current.add(el);
    return () => void nested.current.delete(el);
  }, []);
  React.useLayoutEffect(() => (state.open && registerInParent ? registerInParent(node.current) : undefined), [state.open, registerInParent]);

  React.useLayoutEffect(() => {
    if (!state.open) return setPosition(null);
    let frame = 0;
    const update = () => {
      const a = anchorRef.current;
      const trigger = (typeof a === "function" ? a() : a?.getBoundingClientRect()) ?? state.triggerRef.current?.getBoundingClientRect();
      const el = node.current;
      if (!trigger || !el) return;
      const { width, height } = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = collisionPadding;
      const fitsBelow = trigger.bottom + sideOffset + height <= vh - pad;
      const fitsAbove = trigger.top - sideOffset - height >= pad;
      const below = side === "bottom" ? fitsBelow || !fitsAbove : !fitsAbove && fitsBelow;
      const x = align === "start" ? trigger.left : align === "end" ? trigger.right - width : trigger.left + trigger.width / 2 - width / 2;
      const left = Math.min(Math.max(x, pad), Math.max(pad, vw - width - pad));
      const top = below ? trigger.bottom + sideOffset : trigger.top - sideOffset - height;
      setPosition({ top: Math.max(pad, Math.min(top, vh - height - pad)), left, side: below ? "bottom" : "top" });
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
  }, [state.open, state.triggerRef, side, align, sideOffset, collisionPadding]);

  // Escape and outside clicks close; focus goes back to the trigger.
  React.useEffect(() => {
    if (!state.open) return;
    const trigger = state.triggerRef.current;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (node.current?.contains(target) || trigger?.contains(target) || [...nested.current].some((n) => n.contains(target)));
    const down = (e: PointerEvent) => !inside(e.target) && state.close();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Only the innermost open popover handles Escape.
      if (nested.current.size) return;
      e.preventDefault();
      state.close();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
      if (node.current?.contains(document.activeElement) || document.activeElement === document.body) trigger?.focus({ preventScroll: true });
    };
  }, [state]);

  if (!state.open) return null;
  const content = (
    <div
      {...props}
      ref={(el) => {
        node.current = el;
        setRef(ref, el);
      }}
      id={state.contentId}
      role="dialog"
      data-slot="popover-content"
      data-state="open"
      data-side={position?.side ?? side}
      data-align={align}
      style={{ position: "fixed", zIndex: 50, top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? undefined : "hidden", ...style }}
    >
      <NestedContext.Provider value={register}>{children}</NestedContext.Provider>
    </div>
  );
  if (container === false || typeof document === "undefined") return content;
  return createPortal(content, container ?? document.body);
});

/** Popover for pickers: `<EmojiPopover.Root><EmojiPopover.Trigger/><EmojiPopover.Content>…</EmojiPopover.Content></EmojiPopover.Root>`. */
export const EmojiPopover = { Root, Trigger, Content };
export { PopoverContext };
