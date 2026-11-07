import * as React from "react";
import { createPortal } from "react-dom";
import { Popover, type PopoverRenderProps } from "react-aria-components/Popover";
import { useDialog } from "react-aria/useDialog";
import { useLocale } from "react-aria/I18nProvider";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { useInteractOutside } from "react-aria/useInteractOutside";
import { mergePartProps } from "../../utils/events";
import { useLatest } from "../../utils/latest";
import { useLayoutEffect } from "../../utils/utils";
import { renderElement, resolve, toRenderFunction, type ElementProps } from "../../utils/render";
import { SLOTS } from "../../utils/slots";
import { useOverlayTrigger } from "react-aria/useOverlayTrigger";
import { useOverlayTriggerState } from "react-stately/useOverlayTriggerState";
import { createChangeDetails } from "@brianhung/emoji-picker-core/internal";
import {
  anchorRect,
  closedPointerEvents,
  containerOf,
  finalFocusTarget,
  initialFocusTarget,
  placedSide,
  PopoverProvider,
  popupAttributes,
  positionerAttributes,
  Trigger,
  usePopoverInternals,
  usePopoverState,
  usePopupAttributes,
  type EmojiPopoverAnchor,
  type EmojiPopoverContainer,
  type EmojiPopoverFinalFocus,
  type EmojiPopoverPopupProps,
  type EmojiPopoverPopupState,
  type EmojiPopoverPortalProps,
  type EmojiPopoverPositionerProps,
  type EmojiPopoverPositionerState,
  type EmojiPopoverRootActions,
  type EmojiPopoverRootChangeEventDetails,
  type EmojiPopoverRootChangeEventReason,
  type EmojiPopoverRootProps,
  type EmojiPopoverTriggerProps,
  type EmojiPopoverTriggerState,
  type EmojiSuggestionsPopupProps,
  type EmojiSuggestionsPopupState,
  type EmojiSuggestionsPortalProps,
  type EmojiSuggestionsPositionerProps,
  type EmojiSuggestionsPositionerState,
  type EmojiSuggestionsRootProps,
  type EmojiPopoverAlign,
  type Placement,
  type PopoverInternals,
  type EmojiPopoverSide,
  type TransitionStatus,
} from "../popover-shared";

type Internals = PopoverInternals & { id?: string; modal: boolean; finalFocus: React.MutableRefObject<EmojiPopoverFinalFocus | undefined> };

function Root({ children, modal = true, ...props }: EmojiPopoverRootProps) {
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const state = usePopoverState(props, trigger);
  // Only closes for its trigger scrolling away; the Trigger part opens and closes on press itself
  const overlay = useOverlayTriggerState({ isOpen: state.open, onOpenChange: (open) => state.setOpen(open, open ? "trigger-press" : "scroll") });
  const { triggerProps, overlayProps } = useOverlayTrigger({ type: "dialog" }, overlay, { current: trigger });
  const { onPress: _, ...aria } = triggerProps;
  const finalFocus = React.useRef<EmojiPopoverFinalFocus>(undefined);
  // React Aria's FocusScope returns focus to the Trigger unless it has moved out of the popup
  const wasOpen = React.useRef(state.open);
  React.useEffect(() => {
    const target = wasOpen.current && !state.open ? finalFocusTarget(state, finalFocus.current) : true;
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    wasOpen.current = state.open;
  }, [state]);
  const value: Internals = { state, trigger, setTrigger, triggerProps: (props) => mergeProps(props, aria), id: overlayProps.id, modal, finalFocus };
  return <PopoverProvider value={value}>{children}</PopoverProvider>;
}

const PortalContext = React.createContext<EmojiPopoverContainer | undefined>(undefined);

function Portal({ container, children }: EmojiPopoverPortalProps) {
  return <PortalContext.Provider value={container}>{children}</PortalContext.Provider>;
}

function useAnchorRef(anchor: EmojiPopoverAnchor | undefined, fallback: Element | null) {
  const box = React.useRef<HTMLSpanElement>(null);
  const ref = anchor && "current" in anchor ? anchor : null;
  const virtual = !!anchor && !ref && !(anchor instanceof Element);
  // A virtual anchor moves without a new value, as a caret does, so the box follows it on every render
  useLayoutEffect(() => {
    const r = virtual ? anchorRect(anchor) : undefined;
    if (r && box.current) Object.assign(box.current.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  });
  const element = virtual && typeof document !== "undefined" ? createPortal(<span ref={box} aria-hidden style={{ position: "fixed", visibility: "hidden", pointerEvents: "none" }} />, document.body) : null;
  const target: React.RefObject<Element | null> = virtual
    ? box
    : ref
      ? {
          get current() {
            return ref.current ?? fallback;
          },
        }
      : { current: anchor instanceof Element ? anchor : fallback };
  return [element, target] as const;
}

// React Aria names inline-start "start", and aligns a side placement by "top" and "bottom"
const sideOf = (side: EmojiPopoverSide) => (side === "inline-start" ? "start" : side === "inline-end" ? "end" : side);
const placementOf = (side: EmojiPopoverSide, align: EmojiPopoverAlign) => {
  const s = sideOf(side);
  if (align === "center") return s;
  if (s === "top" || s === "bottom") return `${s} ${align}` as const;
  return `${s} ${align === "start" ? "top" : "bottom"}` as const;
};

// Base UI's alignOffset moves the popup away from its aligned edge; React Aria's crossOffset is physical
const crossOffsetOf = (side: EmojiPopoverSide, align: EmojiPopoverAlign, offset: number, rtl: boolean) => offset * (align === "end" ? -1 : 1) * (rtl && (side === "top" || side === "bottom") ? -1 : 1);

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
function Mounted({ entering, complete }: { entering: boolean; complete?: (open: boolean) => void }) {
  const latest = useLatest(complete);
  React.useEffect(() => void (!entering && latest.current?.(true)), [entering, latest]);
  React.useEffect(() => () => latest.current?.(false), [latest]);
  return null;
}

const statusOf = ({ isEntering, isExiting }: PopoverRenderProps): TransitionStatus => (isEntering ? "starting" : isExiting ? "ending" : "idle");
// Whole device pixels, as Floating UI's floatingStyles, so the popup's glyphs rasterize the same at any fractional offset
const toDevicePixels = (style: React.CSSProperties | undefined, dpr: number): React.CSSProperties | undefined => {
  if (!style) return style;
  const round = (value: React.CSSProperties["top"]) => (typeof value === "number" ? Math.round(value * dpr) / dpr : value);
  return { ...style, top: round(style.top), left: round(style.left), right: round(style.right), bottom: round(style.bottom) };
};

const maxHeightOf = (style: React.CSSProperties | undefined) => (typeof style?.maxHeight === "number" ? `${style.maxHeight}px` : style?.maxHeight);

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

type Positioned = { state: EmojiPopoverPositionerState; status: TransitionStatus };

const PositionerContext = React.createContext<Positioned | null>(null);

function usePositioned(component: string) {
  const positioned = React.useContext(PositionerContext);
  if (!positioned) throw new Error(`${component}.Popup must be inside ${component}.Positioner`);
  return positioned;
}

type Overlay = {
  open: boolean;
  modal: boolean;
  fallback: Element | null;
  onOpenChange: (open: boolean, details: EmojiPopoverRootChangeEventDetails) => void;
  complete?: (open: boolean) => void;
  slot: string;
};

function usePositioner(
  { open, modal, fallback, onOpenChange, complete, slot }: Overlay,
  { side, align, sideOffset, alignOffset, collisionPadding, anchor, className, style, render, children, ...props }: Placement & EmojiPopoverPositionerProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const container = React.useContext(PortalContext);
  const rtl = useLocale().direction === "rtl";
  const [anchorElement, triggerRef] = useAnchorRef(anchor, fallback);
  const node = React.useRef<HTMLDivElement | null>(null);
  const refs = React.useMemo(() => mergeRefs(node, ref), [ref]);
  const dismiss = useDismiss(open, modal, node, triggerRef, (details) => onOpenChange(false, details));
  const custom = toRenderFunction(render);
  const stateOf = ({ placement }: PopoverRenderProps): EmojiPopoverPositionerState => ({ open, side: placedSide(side, placement, rtl), align });
  return (
    <>
      {anchorElement}
      <Popover
        ref={refs}
        triggerRef={triggerRef}
        isOpen={open}
        isNonModal={!modal}
        onOpenChange={(next) => onOpenChange(next, dismiss.take())}
        placement={placementOf(side, align)}
        offset={sideOffset}
        crossOffset={crossOffsetOf(side, align, alignOffset, rtl)}
        containerPadding={collisionPadding}
        UNSTABLE_portalContainer={containerOf(container) as Element | undefined}
        render={(dom, values) => {
          const state = stateOf(values);
          const merged = {
            ...mergePartProps(props, { onKeyDown: dismiss.onKeyDown }, dom),
            ...positionerAttributes(state, slot),
            className: resolve(className, state),
            style: {
              "--transform-origin": anchorPoint(dom.style),
              "--available-height": maxHeightOf(dom.style),
              ...anchorVariables(triggerRef.current, values, sideOffset, collisionPadding),
              ...toDevicePixels(dom.style, typeof window === "undefined" ? 1 : window.devicePixelRatio),
              ...closedPointerEvents(open),
              ...resolve(style, state),
            } as React.CSSProperties,
          } as ElementProps<HTMLDivElement>;
          return custom ? custom(merged, state) : <div {...merged} />;
        }}
      >
        {(values) => {
          const state = stateOf(values);
          return (
            <PositionerContext.Provider value={{ state, status: statusOf(values) }}>
              <Mounted entering={values.isEntering} complete={complete} />
              {resolve(children, state)}
            </PositionerContext.Provider>
          );
        }}
      </Popover>
    </>
  );
}

const Positioner = React.forwardRef<HTMLDivElement, EmojiPopoverPositionerProps>(function Positioner({ side = "bottom", align = "start", sideOffset = 8, alignOffset = 0, collisionPadding = 8, ...props }, ref) {
  const p = usePopoverInternals<Internals>("Positioner");
  const overlay: Overlay = {
    open: p.state.open,
    modal: p.modal,
    fallback: p.trigger,
    onOpenChange: (open, { reason, event }) => p.state.setOpen(open, reason, event),
    complete: p.state.complete,
    slot: SLOTS.popoverPositioner,
  };
  return usePositioner(overlay, { side, align, sideOffset, alignOffset, collisionPadding, ...props }, ref);
});

const Popup = React.forwardRef<HTMLDivElement, EmojiPopoverPopupProps>(function Popup({ initialFocus, finalFocus, className, style, render, children, ...props }, ref) {
  const p = usePopoverInternals<Internals>("Popup");
  const { state: placed, status } = usePositioned("EmojiPopover");
  const node = React.useRef<HTMLDivElement | null>(null);
  const refs = React.useMemo(() => mergeRefs(node, ref), [ref]);
  useLayoutEffect(() => void (p.finalFocus.current = finalFocus));
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on mount, before useDialog focuses the popup itself
  React.useEffect(() => {
    const target = initialFocusTarget(p.state, initialFocus, node.current);
    if (target) target.focus({ preventScroll: true });
  }, []);
  const attributes = usePopupAttributes(props);
  const { dialogProps } = useDialog({ "aria-label": attributes["aria-label"], "aria-labelledby": props["aria-labelledby"] }, node);
  const state: EmojiPopoverPopupState = { ...placed, transitionStatus: status };
  return renderElement("div", { ...mergePartProps(props, dialogProps, { id: p.id }), ...attributes, ...popupAttributes(state), ref: refs, className, style, render, children }, state);
});

type Suggestions = Pick<EmojiSuggestionsRootProps, "open" | "onOpenChange" | "onOpenChangeComplete">;

const SuggestionsContext = React.createContext<Suggestions | null>(null);

function SuggestionsRoot({ open, onOpenChange, onOpenChangeComplete, children }: EmojiSuggestionsRootProps) {
  const value = React.useMemo(() => ({ open, onOpenChange, onOpenChangeComplete }), [open, onOpenChange, onOpenChangeComplete]);
  return <SuggestionsContext.Provider value={value}>{children}</SuggestionsContext.Provider>;
}

const SuggestionsPositioner = React.forwardRef<HTMLDivElement, EmojiSuggestionsPositionerProps>(function SuggestionsPositioner({ side = "bottom", align = "start", sideOffset = 4, alignOffset = 0, collisionPadding = 8, ...props }, ref) {
  const suggestions = React.useContext(SuggestionsContext);
  if (!suggestions) throw new Error("EmojiSuggestions.Positioner must be inside EmojiSuggestions.Root");
  const { open, onOpenChange, onOpenChangeComplete } = suggestions;
  const overlay: Overlay = { open, modal: false, fallback: null, onOpenChange: (next, details) => onOpenChange?.(next, details), complete: onOpenChangeComplete, slot: SLOTS.suggestionsPositioner };
  return usePositioner(overlay, { side, align, sideOffset, alignOffset, collisionPadding, ...props }, ref);
});

const SuggestionsPopup = React.forwardRef<HTMLDivElement, EmojiSuggestionsPopupProps>(function SuggestionsPopup({ className, style, render, children, ...props }, ref) {
  const { state: placed, status } = usePositioned("EmojiSuggestions");
  const state: EmojiSuggestionsPopupState = { ...placed, transitionStatus: status };
  return renderElement(
    "div",
    {
      ...mergePartProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }),
      ...popupAttributes(state),
      "data-slot": SLOTS.suggestionsPopup,
      ref,
      className,
      style,
      render,
      children,
    },
    state,
  );
});

export const EmojiPopover = { Root, Trigger, Portal, Positioner, Popup };
export const EmojiSuggestions = { Root: SuggestionsRoot, Portal, Positioner: SuggestionsPositioner, Popup: SuggestionsPopup };
export {
  Popup as EmojiPopoverPopup,
  Portal as EmojiPopoverPortal,
  Portal as EmojiSuggestionsPortal,
  Positioner as EmojiPopoverPositioner,
  Root as EmojiPopoverRoot,
  SuggestionsPopup as EmojiSuggestionsPopup,
  SuggestionsPositioner as EmojiSuggestionsPositioner,
  SuggestionsRoot as EmojiSuggestionsRoot,
  Trigger as EmojiPopoverTrigger,
};

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
  namespace Portal {
    type Props = EmojiPopoverPortalProps;
  }
  namespace Positioner {
    type Props = EmojiPopoverPositionerProps;
    type State = EmojiPopoverPositionerState;
  }
  namespace Popup {
    type Props = EmojiPopoverPopupProps;
    type State = EmojiPopoverPopupState;
  }
}

export declare namespace EmojiSuggestions {
  namespace Root {
    type Props = EmojiSuggestionsRootProps;
    type ChangeEventReason = EmojiPopoverRootChangeEventReason;
    type ChangeEventDetails = EmojiPopoverRootChangeEventDetails;
  }
  namespace Portal {
    type Props = EmojiSuggestionsPortalProps;
  }
  namespace Positioner {
    type Props = EmojiSuggestionsPositionerProps;
    type State = EmojiSuggestionsPositionerState;
  }
  namespace Popup {
    type Props = EmojiSuggestionsPopupProps;
    type State = EmojiSuggestionsPopupState;
  }
}
