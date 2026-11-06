import * as React from "react";
import { createPortal } from "react-dom";
import { Popover, type PopoverRenderProps } from "react-aria-components/Popover";
import { useLocale } from "react-aria/I18nProvider";
import { mergeProps } from "react-aria/mergeProps";
import { useInteractOutside } from "react-aria/useInteractOutside";
import { mergePartProps } from "../../utils/events";
import { useLatest } from "../../utils/latest";
import { useLayoutEffect } from "../../utils/utils";
import { resolve, toRenderFunction, type ElementProps } from "../../utils/render";
import { SLOTS } from "../../utils/slots";
import { useOverlayTrigger } from "react-aria/useOverlayTrigger";
import { useOverlayTriggerState } from "react-stately/useOverlayTriggerState";
import { createChangeDetails } from "@brianhung/emoji-picker-core/internal";
import {
  anchorRect,
  containerOf,
  finalFocusTarget,
  initialFocusTarget,
  placedSide,
  PopoverProvider,
  stateAttributes,
  Trigger,
  useContentAttributes,
  usePopoverInternals,
  usePopoverState,
  type EmojiPopoverRootActions,
  type PopoverAlign,
  type EmojiPopoverAnchor,
  type EmojiPopoverContentProps,
  type EmojiPopoverContentState,
  type PopoverInternals,
  type EmojiPopoverRootChangeEventDetails,
  type EmojiPopoverRootChangeEventReason,
  type EmojiPopoverRootProps,
  type PopoverSide,
  type EmojiPopoverTriggerProps,
  type EmojiPopoverTriggerState,
  type EmojiSuggestionsPopoverProps,
  type EmojiSuggestionsPopoverState,
  type TransitionStatus,
} from "../popover-shared";

type Internals = PopoverInternals & { id?: string; modal: boolean };

function Root({ children, modal = true, ...props }: EmojiPopoverRootProps) {
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const state = usePopoverState(props, trigger);
  // Only closes for its trigger scrolling away; the Trigger part opens and closes on press itself
  const overlay = useOverlayTriggerState({ isOpen: state.open, onOpenChange: (open) => state.setOpen(open, open ? "trigger-press" : "scroll") });
  const { triggerProps, overlayProps } = useOverlayTrigger({ type: "dialog" }, overlay, { current: trigger });
  const { onPress: _, ...aria } = triggerProps;
  const value: Internals = { state, trigger, setTrigger, triggerProps: (props) => mergeProps(props, aria), id: overlayProps.id, modal };
  return <PopoverProvider value={value}>{children}</PopoverProvider>;
}

function useAnchorRef(anchor: EmojiPopoverAnchor | undefined, fallback: Element | null) {
  const box = React.useRef<HTMLSpanElement>(null);
  const virtual = !!anchor && !(anchor instanceof Element);
  // A virtual anchor moves without a new value, as a caret does, so the box follows it on every render
  useLayoutEffect(() => {
    const r = virtual ? anchorRect(anchor) : undefined;
    if (r && box.current) Object.assign(box.current.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  });
  const element = virtual && typeof document !== "undefined" ? createPortal(<span ref={box} aria-hidden style={{ position: "fixed", visibility: "hidden", pointerEvents: "none" }} />, document.body) : null;
  return [element, virtual ? box : { current: anchor instanceof Element ? anchor : fallback }] as const;
}

// React Aria names inline-start "start", and aligns a side placement by "top" and "bottom"
const sideOf = (side: PopoverSide) => (side === "inline-start" ? "start" : side === "inline-end" ? "end" : side);
const placementOf = (side: PopoverSide, align: PopoverAlign) => {
  const s = sideOf(side);
  if (align === "center") return s;
  if (s === "top" || s === "bottom") return `${s} ${align}` as const;
  return `${s} ${align === "start" ? "top" : "bottom"}` as const;
};

// React Aria's onOpenChange carries no reason or event: the outside press and Escape that start a close leave both. Non-modal, React Aria doesn't close on an outside press; this does, as modal
function useDismiss(open: boolean, modal: boolean, ref: React.RefObject<Element | null>, triggerRef: React.RefObject<Element | null>, close: (details: EmojiPopoverRootChangeEventDetails) => void) {
  const last = React.useRef<{ reason: EmojiPopoverRootChangeEventReason; event?: Event } | null>(null);
  const take = () => {
    const { reason, event } = last.current ?? { reason: "none" as const };
    last.current = null;
    return createChangeDetails(reason, event);
  };
  useInteractOutside({
    ref,
    isDisabled: !open,
    onInteractOutsideStart: (event) => void (last.current = { reason: "outside-press", event }),
    onInteractOutside: (event) => !modal && !triggerRef.current?.contains(event.target as Node) && close(take()),
  });
  return { take, onKeyDown: (e: React.KeyboardEvent) => void (e.key === "Escape" && (last.current = { reason: "escape-key", event: e.nativeEvent })) };
}

// React Aria unmounts the popover once its exit animation ends, and reports entering until the entry animation ends
function Mounted({ entering, complete, initialFocus }: { entering: boolean; complete?: (open: boolean) => void; initialFocus?: () => HTMLElement | false | null }) {
  const latest = useLatest(complete);
  React.useEffect(() => void (!entering && latest.current?.(true)), [entering, latest]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on mount: initial focus, and completion on unmount
  React.useEffect(() => {
    const target = initialFocus?.();
    if (target) target.focus({ preventScroll: true });
    return () => latest.current?.(false);
  }, []);
  return null;
}

const stateOf = ({ placement }: PopoverRenderProps, open: boolean, side: PopoverSide, align: PopoverAlign, rtl: boolean): EmojiPopoverContentState => ({ open, side: placedSide(side, placement, rtl), align });
const statusOf = ({ isEntering, isExiting }: PopoverRenderProps): TransitionStatus => (isEntering ? "starting" : isExiting ? "ending" : "open");
const maxHeightOf = (style: React.CSSProperties | undefined) => (typeof style?.maxHeight === "number" ? `${style.maxHeight}px` : style?.maxHeight);

// State attributes, and className and style as functions of the part's state rather than React Aria's
const anchorPoint = (style: React.CSSProperties | undefined) => {
  const value = style && "--trigger-anchor-point" in style ? style["--trigger-anchor-point"] : undefined;
  return typeof value === "string" ? value : undefined;
};

// React Aria measures the height left below or above; the width left beside the anchor and the anchor's size are measured here, as Floating UI's size()
const anchorVariables = (anchor: Element | null, { placement }: PopoverRenderProps, offset: number, padding: number): Record<`--${string}`, string> => {
  if (!anchor) return {};
  const r = anchor.getBoundingClientRect();
  const viewport = anchor.ownerDocument.documentElement.clientWidth;
  const available = placement === "left" ? r.left - offset - padding : placement === "right" ? viewport - r.right - offset - padding : viewport - 2 * padding;
  return { "--anchor-width": `${Math.round(r.width)}px`, "--anchor-height": `${Math.round(r.height)}px`, "--available-width": `${Math.max(0, Math.round(available))}px` };
};

type Measured = { anchor: Element | null; offset: number; padding: number };

const partAttributes = (
  dom: { style?: React.CSSProperties },
  values: PopoverRenderProps,
  state: EmojiPopoverContentState,
  { anchor, offset, padding }: Measured,
  className: EmojiPopoverContentProps["className"],
  style: EmojiPopoverContentProps["style"],
) => ({
  ...stateAttributes(state, statusOf(values)),
  className: resolve(className, state),
  style: { "--transform-origin": anchorPoint(dom.style), "--available-height": maxHeightOf(dom.style), ...anchorVariables(anchor, values, offset, padding), ...dom.style, ...resolve(style, state) } as React.CSSProperties,
});

const Content = React.forwardRef<HTMLDivElement, EmojiPopoverContentProps>(function Content(
  { side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, container, anchor, initialFocus, finalFocus, className, style, render, children, ...props },
  ref,
) {
  const p = usePopoverInternals<Internals>("Content");
  const rtl = useLocale().direction === "rtl";
  // React Aria's FocusScope returns focus to the Trigger unless it has moved out of the content
  const wasOpen = React.useRef(p.state.open);
  React.useEffect(() => {
    const target = wasOpen.current && !p.state.open ? finalFocusTarget(p.state, finalFocus) : true;
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    wasOpen.current = p.state.open;
  }, [p.state, finalFocus]);
  const [anchorElement, triggerRef] = useAnchorRef(anchor, p.trigger);
  const node = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => node.current!);
  const setOpen = (open: boolean, { reason, event }: EmojiPopoverRootChangeEventDetails) => p.state.setOpen(open, reason, event);
  const dismiss = useDismiss(p.state.open, p.modal, node, triggerRef, (details) => setOpen(false, details));
  const custom = toRenderFunction(render);
  const attributes = useContentAttributes(props);
  return (
    <>
      {anchorElement}
      <Popover
        ref={node}
        triggerRef={triggerRef}
        isOpen={p.state.open}
        isNonModal={!p.modal}
        onOpenChange={(open) => setOpen(open, dismiss.take())}
        placement={placementOf(side, align)}
        offset={sideOffset}
        containerPadding={collisionPadding}
        UNSTABLE_portalContainer={containerOf(container) as Element | undefined}
        render={(dom, values) => {
          const state = stateOf(values, p.state.open, side, align, rtl);
          const merged = {
            ...mergePartProps(props, { onKeyDown: dismiss.onKeyDown }, dom, { id: p.id }),
            ...attributes,
            ...partAttributes(dom, values, state, { anchor: triggerRef.current, offset: sideOffset, padding: collisionPadding }, className, style),
          };
          return custom ? custom(merged, state) : <div {...merged} />;
        }}
      >
        {(values) => (
          <>
            <Mounted entering={values.isEntering} complete={p.state.complete} initialFocus={() => initialFocusTarget(p.state, initialFocus, node.current)} />
            {children}
          </>
        )}
      </Popover>
    </>
  );
});

function SuggestionsPopover({
  open,
  onOpenChange,
  onOpenChangeComplete,
  anchor,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  collisionPadding = 8,
  container,
  className,
  style,
  render,
  children,
  ...props
}: EmojiSuggestionsPopoverProps) {
  const [anchorElement, triggerRef] = useAnchorRef(anchor, null);
  const rtl = useLocale().direction === "rtl";
  const custom = toRenderFunction(render);
  const node = React.useRef<HTMLDivElement | null>(null);
  const dismiss = useDismiss(open, false, node, triggerRef, (details) => onOpenChange?.(false, details));
  return (
    <>
      {anchorElement}
      <Popover
        ref={node}
        isNonModal
        triggerRef={triggerRef}
        isOpen={open}
        onOpenChange={(next) => onOpenChange?.(next, dismiss.take())}
        placement={placementOf(side, align)}
        offset={sideOffset}
        containerPadding={collisionPadding}
        UNSTABLE_portalContainer={containerOf(container) as Element | undefined}
        render={(dom, values) => {
          const state: EmojiSuggestionsPopoverState = stateOf(values, open, side, align, rtl);
          const merged = {
            ...mergePartProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }, dom),
            "data-slot": SLOTS.suggestions,
            ...partAttributes(dom, values, state, { anchor: triggerRef.current, offset: sideOffset, padding: collisionPadding }, className, style),
          } as ElementProps<HTMLDivElement>;
          return custom ? custom(merged, state) : <div {...merged} />;
        }}
      >
        {(values) => (
          <>
            <Mounted entering={values.isEntering} complete={onOpenChangeComplete} />
            {children as React.ReactNode}
          </>
        )}
      </Popover>
    </>
  );
}

export const EmojiPopover = { Root, Trigger, Content };
export const EmojiSuggestions = { Popover: SuggestionsPopover };

export declare namespace EmojiPopover {
  namespace Root {
    type Props = EmojiPopoverRootProps;
    type Actions = EmojiPopoverRootActions;
    type ChangeEventReason = EmojiPopoverRootChangeEventReason;
    type ChangeEventDetails = EmojiPopoverRootChangeEventDetails;
  }
  namespace Trigger {
    type Props = EmojiPopoverTriggerProps;
    type State = EmojiPopoverTriggerState;
  }
  namespace Content {
    type Props = EmojiPopoverContentProps;
    type State = EmojiPopoverContentState;
  }
}

export declare namespace EmojiSuggestions {
  namespace Popover {
    type Props = EmojiSuggestionsPopoverProps;
    type State = EmojiSuggestionsPopoverState;
    type ChangeEventReason = EmojiPopoverRootChangeEventReason;
    type ChangeEventDetails = EmojiPopoverRootChangeEventDetails;
  }
}
