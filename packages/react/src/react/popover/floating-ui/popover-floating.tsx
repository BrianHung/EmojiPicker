"use client";

import * as React from "react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingRootContext,
  useInteractions,
  useMergeRefs,
  useRole,
  type FloatingContext,
  type FloatingRootContext,
  type Middleware,
  type OpenChangeReason,
  type UseFloatingOptions,
} from "@floating-ui/react";
import { useLocale } from "react-aria/I18nProvider";
import { createChangeDetails, shallowEqual } from "@brianhung/emoji-picker-core/internal";
import { mergePartProps } from "../../utils/events";
import { useLatest } from "../../utils/latest";
import { useLayoutEffect } from "../../utils/utils";
import { renderElement, resolve, type EmojiPickerPartElementProps } from "../../utils/render";
import { SLOTS } from "../../utils/slots";
import {
  anchorElement,
  anchorRect,
  closedPointerEvents,
  containerOf,
  finalFocusTarget,
  initialFocusTarget,
  physicalSide,
  placedSide,
  PopoverProvider,
  popupAttributes,
  positionerAttributes,
  Trigger,
  usePopoverInternals,
  usePopoverState,
  usePopupAttributes,
  useTransition,
  type EmojiPopoverContainer,
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
  type Placement,
  type PopoverInternals,
  type TransitionStatus,
} from "../popover-shared";

type Placed = { placement: string; position: React.CSSProperties["position"]; top: React.CSSProperties["top"]; left: React.CSSProperties["left"]; origin: string | undefined };

type FloatingProps = (props: React.HTMLAttributes<HTMLElement>) => Record<string, unknown>;

type Mount = { status: TransitionStatus | null; popup: React.RefObject<HTMLElement | null> };

type Internals = PopoverInternals &
  Mount & {
    context: FloatingRootContext;
    nodeId?: string;
    modal: boolean;
    setFloating: (el: HTMLElement | null) => void;
    floatingProps: FloatingProps;
  };

type Positioned = { context: FloatingContext; state: EmojiPopoverPositionerState; status: TransitionStatus; floatingProps: FloatingProps };

const PositionerContext = React.createContext<Positioned | null>(null);

function usePositioned(component: string) {
  const positioned = React.useContext(PositionerContext);
  if (!positioned) throw new Error(`${component}.Popup must be inside ${component}.Positioner`);
  return positioned;
}

const REASONS: Partial<Record<OpenChangeReason, EmojiPopoverRootChangeEventReason>> = {
  "outside-press": "outside-press",
  "escape-key": "escape-key",
  "focus-out": "focus-out",
  "ancestor-scroll": "scroll",
  "reference-press": "trigger-press",
  click: "trigger-press",
};
const reasonOf = (reason: OpenChangeReason | undefined) => (reason && REASONS[reason]) || "none";

function Root(props: EmojiPopoverRootProps) {
  const node = <RootNode {...props} />;
  return useFloatingParentNodeId() === null ? <FloatingTree>{node}</FloatingTree> : node;
}

function RootNode({ children, modal = false, ...props }: EmojiPopoverRootProps) {
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const state = usePopoverState(props, trigger);
  const nodeId = useFloatingNodeId();
  const [floating, setFloating] = React.useState<HTMLElement | null>(null);
  const popup = React.useRef<HTMLElement | null>(null);
  const status = useTransition(state.open, popup, state.complete);
  const context = useFloatingRootContext({ open: state.open, onOpenChange: (open, event, reason) => state.setOpen(open, reasonOf(reason), event), elements: { reference: trigger, floating } });
  const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context), useRole(context)]);
  const value: Internals = { state, trigger, setTrigger, triggerProps: (props) => getReferenceProps(props as React.HTMLProps<Element>), context, nodeId, modal, setFloating, floatingProps: getFloatingProps, status, popup };
  return (
    <PopoverProvider value={value}>
      <FloatingNode id={nodeId}>{children}</FloatingNode>
    </PopoverProvider>
  );
}

// A reference hidden on close (a hover toolbar) measures 0 x 0 at the viewport's corner
const hasBox = (r: { width: number; height: number }) => r.width > 0 || r.height > 0;

const transformOrigin: Middleware = {
  name: "transformOrigin",
  fn: ({ x, y, placement, rects: { reference: r, floating: f } }) => {
    const side = placement.split("-")[0];
    const clamp = (n: number, max: number) => Math.round(Math.min(Math.max(n, 0), max));
    const vertical = side === "top" || side === "bottom";
    const ox = vertical ? clamp(r.x + r.width / 2 - x, f.width) : Math.round((side === "left" ? r.x : r.x + r.width) - x);
    const oy = vertical ? Math.round((side === "top" ? r.y : r.y + r.height) - y) : clamp(r.y + r.height / 2 - y, f.height);
    return { data: { origin: `${ox}px ${oy}px`, detached: !hasBox(r) } };
  },
};

function usePlacement({ side, align, sideOffset, alignOffset, collisionPadding, anchor }: Placement & Pick<EmojiPopoverPositionerProps, "anchor">, options: UseFloatingOptions) {
  const rtl = useLocale().direction === "rtl";
  const physical = physicalSide(side, rtl);
  const floating = useFloating({
    ...options,
    strategy: "fixed",
    placement: align === "center" ? physical : `${physical}-${align}`,
    transform: false,
    whileElementsMounted: (reference, floating, update) => autoUpdate(reference, floating, update, { layoutShift: false }),
    middleware: [
      offset({ mainAxis: sideOffset, crossAxis: alignOffset, alignmentAxis: alignOffset }),
      flip({ padding: collisionPadding, fallbackStrategy: "initialPlacement", crossAxis: false }),
      shift({ padding: collisionPadding, crossAxis: true }),
      size({
        padding: collisionPadding,
        apply({ availableWidth, availableHeight, elements, rects }) {
          if (!hasBox(rects.reference)) return;
          const { style } = elements.floating;
          style.setProperty("--available-width", `${Math.round(availableWidth)}px`);
          style.setProperty("--available-height", `${Math.round(availableHeight)}px`);
          style.setProperty("--anchor-width", `${Math.round(rects.reference.width)}px`);
          style.setProperty("--anchor-height", `${Math.round(rects.reference.height)}px`);
        },
      }),
      transformOrigin,
    ],
  });
  const latest = useLatest(anchor);
  const { setPositionReference, domReference } = floating.refs;
  const reference = React.useRef<Element | "virtual" | null>(null);
  // A ref or function anchor resolves after commit, so the reference is checked on every render and set when it changes
  useLayoutEffect(() => {
    const target = latest.current ? (anchorElement(latest.current) ?? "virtual") : null;
    if (target === reference.current) return;
    reference.current = target;
    setPositionReference(target === "virtual" ? { getBoundingClientRect: () => anchorRect(latest.current) ?? domReference.current?.getBoundingClientRect() ?? new DOMRect() } : target);
  });
  const origin = floating.middlewareData.transformOrigin?.origin;
  // floatingStyles rounds to whole device pixels, so the popup's glyphs rasterize the same at any fractional offset
  const { position, top, left } = floating.floatingStyles;
  const live: Placed = { placement: floating.placement, position, top, left, origin };
  // Closing (the exit animation) and a hidden reference keep the last position: React's state from a previous render
  const [held, setHeld] = React.useState(live);
  const fresh = options.open && !floating.middlewareData.transformOrigin?.detached;
  if (fresh && !shallowEqual(held, live)) setHeld(live);
  const shown = fresh ? live : held;
  const state: EmojiPopoverPositionerState = { open: !!options.open, side: placedSide(side, shown.placement.split("-")[0], rtl), align };
  return { context: floating.context, setFloating: floating.refs.setFloating, state, style: { position: shown.position, top: shown.top, left: shown.left, zIndex: 50, "--transform-origin": shown.origin } as React.CSSProperties };
}

const portal = (status: TransitionStatus | null, container: EmojiPopoverContainer | undefined, children: React.ReactNode) => (status ? <FloatingPortal root={containerOf(container)}>{children}</FloatingPortal> : null);

function positioned(
  { context, state, style }: ReturnType<typeof usePlacement>,
  status: TransitionStatus,
  floatingProps: FloatingProps,
  slot: string,
  { className, style: own, render, children, ...props }: EmojiPickerPartElementProps<EmojiPopoverPositionerState>,
  ref: React.Ref<HTMLDivElement>,
) {
  return (
    <PositionerContext.Provider value={{ context, state, status, floatingProps }}>
      {renderElement(
        "div",
        { ...mergePartProps(props), ...positionerAttributes(state, slot), ref, className, style: (s: EmojiPopoverPositionerState) => ({ ...style, ...closedPointerEvents(state.open), ...resolve(own, s) }), render, children },
        state,
      )}
    </PositionerContext.Provider>
  );
}

function Portal({ container, children }: EmojiPopoverPortalProps) {
  return portal(usePopoverInternals<Internals>("Portal").status, container, children);
}

const Positioner = React.forwardRef<HTMLDivElement, EmojiPopoverPositionerProps>(function Positioner({ side = "bottom", align = "start", sideOffset = 8, alignOffset = 0, collisionPadding = 8, anchor, ...props }, ref) {
  const p = usePopoverInternals<Internals>("Positioner");
  const placement = usePlacement({ side, align, sideOffset, alignOffset, collisionPadding, anchor }, { rootContext: p.context, nodeId: p.nodeId, open: p.state.open });
  const refs = useMergeRefs([p.setFloating, ref]);
  return p.status && positioned(placement, p.status, p.floatingProps, SLOTS.popoverPositioner, props, refs);
});

const Popup = React.forwardRef<HTMLDivElement, EmojiPopoverPopupProps>(function Popup({ initialFocus, finalFocus, className, style, render, children, ...props }, ref) {
  const p = usePopoverInternals<Internals>("Popup");
  const { context, state: placed, status, floatingProps } = usePositioned("EmojiPopover");
  const mergedRef = useMergeRefs([p.popup, ref]);
  const latest = useLatest({ initialFocus, finalFocus, p });
  // Read by FloatingFocusManager as it moves focus; leaving focus in place is focusing what already has it
  const [focusTarget] = React.useState(
    () =>
      ({
        get current() {
          const { initialFocus, p } = latest.current;
          const target = initialFocusTarget(p.state, initialFocus, p.popup.current);
          return target === false ? (p.popup.current?.ownerDocument.activeElement as HTMLElement | null) : target;
        },
      }) as React.MutableRefObject<HTMLElement | null>,
  );
  const [returnTarget] = React.useState(
    () =>
      ({
        get current() {
          const { finalFocus, p } = latest.current;
          const target = finalFocusTarget(p.state, finalFocus);
          return target === true ? p.trigger : target || null;
        },
      }) as React.MutableRefObject<HTMLElement | null>,
  );
  const state: EmojiPopoverPopupState = { ...placed, transitionStatus: status };
  const attributes = usePopupAttributes(props);
  return (
    <FloatingFocusManager context={context} modal={p.modal} disabled={!p.state.open} initialFocus={initialFocus === false ? -1 : focusTarget} returnFocus={finalFocus === undefined ? true : returnTarget}>
      {renderElement("div", { ...floatingProps(mergePartProps(props)), ...attributes, ...popupAttributes(state), ref: mergedRef, className, style, render, children }, state)}
    </FloatingFocusManager>
  );
});

type Suggestions = Mount & Pick<EmojiSuggestionsRootProps, "open" | "onOpenChange">;

const SuggestionsContext = React.createContext<Suggestions | null>(null);

function useSuggestions(part: string) {
  const suggestions = React.useContext(SuggestionsContext);
  if (!suggestions) throw new Error(`EmojiSuggestions.${part} must be inside EmojiSuggestions.Root`);
  return suggestions;
}

function SuggestionsRoot({ open, onOpenChange, onOpenChangeComplete, children }: EmojiSuggestionsRootProps) {
  const popup = React.useRef<HTMLElement | null>(null);
  const status = useTransition(open, popup, onOpenChangeComplete);
  const value = React.useMemo(() => ({ open, onOpenChange, status, popup }), [open, onOpenChange, status]);
  return <SuggestionsContext.Provider value={value}>{children}</SuggestionsContext.Provider>;
}

function SuggestionsPortal({ container, children }: EmojiSuggestionsPortalProps) {
  return portal(useSuggestions("Portal").status, container, children);
}

const SuggestionsPositioner = React.forwardRef<HTMLDivElement, EmojiSuggestionsPositionerProps>(function SuggestionsPositioner(
  { anchor, side = "bottom", align = "start", sideOffset = 4, alignOffset = 0, collisionPadding = 8, ...props },
  ref,
) {
  const { open, onOpenChange, status } = useSuggestions("Positioner");
  const placement = usePlacement({ side, align, sideOffset, alignOffset, collisionPadding, anchor }, { open, onOpenChange: (next, event, reason) => onOpenChange?.(next, createChangeDetails(reasonOf(reason), event)) });
  const { getFloatingProps } = useInteractions([useDismiss(placement.context, { escapeKey: false })]);
  const refs = useMergeRefs([placement.setFloating, ref]);
  return status && positioned(placement, status, getFloatingProps, SLOTS.suggestionsPositioner, props, refs);
});

const SuggestionsPopup = React.forwardRef<HTMLDivElement, EmojiSuggestionsPopupProps>(function SuggestionsPopup({ className, style, render, children, ...props }, ref) {
  const { popup } = useSuggestions("Popup");
  const { state: placed, status, floatingProps } = usePositioned("EmojiSuggestions");
  const refs = useMergeRefs([popup, ref]);
  const state: EmojiSuggestionsPopupState = { ...placed, transitionStatus: status };
  return renderElement(
    "div",
    {
      ...floatingProps(mergePartProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() })),
      ...popupAttributes(state),
      "data-slot": SLOTS.suggestionsPopup,
      ref: refs,
      className,
      style,
      render,
      children,
    },
    state,
  );
});

export const EmojiPopover = { Root, Trigger, Portal, Positioner, Popup };
export const EmojiSuggestions = { Root: SuggestionsRoot, Portal: SuggestionsPortal, Positioner: SuggestionsPositioner, Popup: SuggestionsPopup };
export {
  Popup as EmojiPopoverPopup,
  Portal as EmojiPopoverPortal,
  Positioner as EmojiPopoverPositioner,
  Root as EmojiPopoverRoot,
  SuggestionsPopup as EmojiSuggestionsPopup,
  SuggestionsPortal as EmojiSuggestionsPortal,
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
