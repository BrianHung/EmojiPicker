import * as React from "react";
import { createPortal } from "react-dom";
import { Popover, type PopoverRenderProps } from "react-aria-components/Popover";
import { useLocale } from "react-aria/I18nProvider";
import { mergeProps } from "react-aria/mergeProps";
import { useInteractOutside } from "react-aria/useInteractOutside";
import { mergePartProps } from "../../utils/events";
import { resolve, toRenderFunction, type ElementProps } from "../../utils/render";
import { SLOTS } from "../../utils/slots";
import { useOverlayTrigger } from "react-aria/useOverlayTrigger";
import { useOverlayTriggerState } from "react-stately/useOverlayTriggerState";
import { createChangeDetails } from "@brianhung/emoji-picker-core";
import type { PopoverOpenChangeReason } from "../popover-context";
import {
  anchorRect,
  ContentFocus,
  finalFocusTarget,
  initialFocusTarget,
  placedSide,
  PopoverProvider,
  stateAttributes,
  Trigger,
  useContentAttributes,
  usePopoverInternals,
  usePopoverState,
  type PopoverActions,
  type PopoverAlign,
  type PopoverAnchor,
  type PopoverContentProps,
  type PopoverContentState,
  type PopoverInitialFocus,
  type PopoverInternals,
  type PopoverOpenChangeDetails,
  type PopoverRootProps,
  type PopoverSide,
  type PopoverTriggerProps,
  type PopoverTriggerState,
  type SuggestionsPopoverProps,
  type SuggestionsPopoverState,
  type TransitionStatus,
} from "../popover-shared";

type Internals = PopoverInternals & { id?: string; modal: boolean };

function Root({ children, modal = true, ...props }: PopoverRootProps) {
  const state = usePopoverState(props);
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  // Only closes for its trigger scrolling away; the Trigger part opens and closes on press itself
  const overlay = useOverlayTriggerState({ isOpen: state.open, onOpenChange: (open) => state.setOpen(open, open ? "trigger-press" : "scroll") });
  const { triggerProps, overlayProps } = useOverlayTrigger({ type: "dialog" }, overlay, { current: trigger });
  const { onPress: _, ...aria } = triggerProps;
  const value: Internals = { state, trigger, setTrigger, triggerProps: (props) => mergeProps(props, aria), id: overlayProps.id, modal };
  return <PopoverProvider value={value}>{children}</PopoverProvider>;
}

function useAnchorRef(anchor: PopoverAnchor | undefined, fallback: Element | null) {
  const box = React.useRef<HTMLSpanElement>(null);
  const virtual = !!anchor && !(anchor instanceof Element);
  React.useLayoutEffect(() => {
    const r = virtual ? anchorRect(anchor) : undefined;
    if (r && box.current) Object.assign(box.current.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  });
  const element = virtual && typeof document !== "undefined" ? createPortal(<span ref={box} aria-hidden style={{ position: "fixed", visibility: "hidden", pointerEvents: "none" }} />, document.body) : null;
  return [element, virtual ? box : { current: anchor instanceof Element ? anchor : fallback }] as const;
}

// React Aria names inline-start "start", and aligns a side placement by "top" and "bottom"
const placementOf = (side: PopoverSide, align: PopoverAlign) => {
  const cross = align === "center" ? "" : side === "top" || side === "bottom" ? align : align === "start" ? "top" : "bottom";
  return `${side.replace("inline-", "")}${cross && ` ${cross}`}` as never;
};

// React Aria's onOpenChange carries no reason or event: the outside press and Escape that start a close leave both. Non-modal, React Aria doesn't close on an outside press; this does, as modal
function useDismiss(open: boolean, modal: boolean, ref: React.RefObject<Element | null>, triggerRef: React.RefObject<Element | null>, close: (details: PopoverOpenChangeDetails) => void) {
  const last = React.useRef<{ reason: PopoverOpenChangeReason; event?: Event } | null>(null);
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
function Mounted({ entering, complete, initialFocus, content }: { entering: boolean; complete?: (open: boolean) => void; initialFocus?: PopoverInitialFocus; content?: React.RefObject<HTMLElement | null> }) {
  const latest = React.useRef(complete);
  latest.current = complete;
  React.useEffect(() => void (!entering && latest.current?.(true)), [entering]);
  React.useEffect(() => {
    if (content) initialFocusTarget(initialFocus, content.current)?.focus({ preventScroll: true });
    return () => latest.current?.(false);
  }, []);
  return null;
}

const stateOf = ({ placement }: PopoverRenderProps, open: boolean, side: PopoverSide, align: PopoverAlign, rtl: boolean): PopoverContentState => ({ open, side: placedSide(side, placement, rtl), align });
const statusOf = ({ isEntering, isExiting }: PopoverRenderProps): TransitionStatus => (isEntering ? "starting" : isExiting ? "ending" : "open");
const maxHeightOf = (style: React.CSSProperties | undefined) => (typeof style?.maxHeight === "number" ? `${style.maxHeight}px` : style?.maxHeight);

// State attributes, and className and style as functions of the part's state rather than React Aria's
const partAttributes = (dom: { style?: React.CSSProperties }, values: PopoverRenderProps, state: PopoverContentState, className: PopoverContentProps["className"], style: PopoverContentProps["style"]) => ({
  ...stateAttributes(state, statusOf(values)),
  className: resolve(className, state),
  style: { "--transform-origin": dom.style?.["--trigger-anchor-point" as never], "--available-height": maxHeightOf(dom.style), ...dom.style, ...resolve(style, state) } as React.CSSProperties,
});

const Content = React.forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  { side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, container, anchor, initialFocus, finalFocus, className, style, render, children, ...props },
  ref,
) {
  const p = usePopoverInternals<Internals>("Content");
  const rtl = useLocale().direction === "rtl";
  const wasOpen = React.useRef(p.state.open);
  React.useEffect(() => {
    if (wasOpen.current && !p.state.open && finalFocus && p.state.selected.current) finalFocusTarget(finalFocus)?.focus({ preventScroll: true });
    wasOpen.current = p.state.open;
  }, [p.state.open]);
  const [anchorElement, triggerRef] = useAnchorRef(anchor, p.trigger);
  const node = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => node.current!);
  const setOpen = (open: boolean, { reason, event }: PopoverOpenChangeDetails) => p.state.setOpen(open, reason, event);
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
        UNSTABLE_portalContainer={container || undefined}
        render={(dom, values) => {
          const state = stateOf(values, p.state.open, side, align, rtl);
          const merged = {
            ...mergePartProps(props, { onKeyDown: dismiss.onKeyDown }, dom, { id: p.id }),
            ...attributes,
            ...partAttributes(dom, values, state, className, style),
          };
          return custom ? custom(merged, state) : <div {...merged} />;
        }}
      >
        {(values) => (
          <>
            <Mounted entering={values.isEntering} complete={p.state.complete} initialFocus={initialFocus} content={node} />
            <ContentFocus initialFocus={initialFocus}>{children}</ContentFocus>
          </>
        )}
      </Popover>
    </>
  );
});

function SuggestionsPopover({ open, onOpenChange, onOpenChangeComplete, anchor, side = "bottom", align = "start", sideOffset = 4, collisionPadding = 8, container, className, style, render, children, ...props }: SuggestionsPopoverProps) {
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
        UNSTABLE_portalContainer={container || undefined}
        render={(dom, values) => {
          const state: SuggestionsPopoverState = stateOf(values, open, side, align, rtl);
          const merged = {
            ...mergePartProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }, dom),
            "data-slot": SLOTS.suggestions,
            ...partAttributes(dom, values, state, className, style),
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
    type Props = PopoverRootProps;
    type Actions = PopoverActions;
    type OpenChangeDetails = PopoverOpenChangeDetails;
  }
  namespace Trigger {
    type Props = PopoverTriggerProps;
    type State = PopoverTriggerState;
  }
  namespace Content {
    type Props = PopoverContentProps;
    type State = PopoverContentState;
  }
}

export declare namespace EmojiSuggestions {
  namespace Popover {
    type Props = SuggestionsPopoverProps;
    type State = SuggestionsPopoverState;
  }
}
