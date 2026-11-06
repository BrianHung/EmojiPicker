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
  type FloatingRootContext,
  type Middleware,
  type OpenChangeReason,
  type UseFloatingOptions,
} from "@floating-ui/react";
import { useLocale } from "react-aria/I18nProvider";
import { createChangeDetails } from "@brianhung/emoji-picker-core";
import type { PopoverOpenChangeReason } from "../popover-context";
import { mergePartProps } from "../../utils/events";
import { renderElement, resolve } from "../../utils/render";
import { SLOTS } from "../../utils/slots";
import {
  anchorRect,
  ContentFocus,
  finalFocusTarget,
  initialFocusTarget,
  physicalSide,
  placedSide,
  PopoverProvider,
  stateAttributes,
  Trigger,
  useContentAttributes,
  usePopoverInternals,
  usePopoverState,
  useTransition,
  type PopoverActions,
  type PopoverAnchor,
  type PopoverContentProps,
  type PopoverContentState,
  type PopoverInternals,
  type PopoverOpenChangeDetails,
  type PopoverPlacementProps,
  type PopoverRootProps,
  type PopoverTriggerProps,
  type PopoverTriggerState,
  type SuggestionsPopoverProps,
  type SuggestionsPopoverState,
} from "../popover-shared";

type Internals = PopoverInternals & {
  context: FloatingRootContext;
  nodeId?: string;
  modal: boolean;
  setFloating: (el: HTMLElement | null) => void;
  floatingProps: (props: React.HTMLAttributes<HTMLElement>) => Record<string, unknown>;
};

const REASONS: Partial<Record<OpenChangeReason, PopoverOpenChangeReason>> = {
  "outside-press": "outside-press",
  "escape-key": "escape-key",
  "focus-out": "focus-out",
  "ancestor-scroll": "scroll",
  "reference-press": "trigger-press",
  click: "trigger-press",
};
const reasonOf = (reason: OpenChangeReason | undefined) => (reason && REASONS[reason]) || "none";

function Root(props: PopoverRootProps) {
  const node = <RootNode {...props} />;
  return useFloatingParentNodeId() === null ? <FloatingTree>{node}</FloatingTree> : node;
}

function RootNode({ children, modal = false, ...props }: PopoverRootProps) {
  const state = usePopoverState(props);
  const nodeId = useFloatingNodeId();
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const [floating, setFloating] = React.useState<HTMLElement | null>(null);
  const context = useFloatingRootContext({ open: state.open, onOpenChange: (open, event, reason) => state.setOpen(open, reasonOf(reason), event), elements: { reference: trigger, floating } });
  const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context), useRole(context)]);
  const value: Internals = { state, trigger, setTrigger, triggerProps: (props) => getReferenceProps(props as React.HTMLProps<Element>), context, nodeId, modal, setFloating, floatingProps: getFloatingProps };
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

function usePlacement({ side = "bottom", align = "start", sideOffset, collisionPadding = 8, anchor }: PopoverPlacementProps & { anchor?: PopoverAnchor }, options: UseFloatingOptions) {
  const rtl = useLocale().direction === "rtl";
  const physical = physicalSide(side, rtl);
  const floating = useFloating({
    ...options,
    strategy: "fixed",
    placement: align === "center" ? physical : `${physical}-${align}`,
    transform: false,
    whileElementsMounted: (reference, floating, update) => autoUpdate(reference, floating, update, { layoutShift: false }),
    middleware: [
      offset(sideOffset),
      flip({ padding: collisionPadding, fallbackStrategy: "initialPlacement", crossAxis: false }),
      shift({ padding: collisionPadding, crossAxis: true }),
      size({
        padding: collisionPadding,
        apply({ availableWidth, availableHeight, elements, rects }) {
          if (!hasBox(rects.reference)) return;
          elements.floating.style.setProperty("--available-width", `${Math.round(availableWidth)}px`);
          elements.floating.style.setProperty("--available-height", `${Math.round(availableHeight)}px`);
        },
      }),
      transformOrigin,
    ],
  });
  const latest = React.useRef(anchor);
  latest.current = anchor;
  const { setPositionReference, domReference } = floating.refs;
  const key = anchor instanceof Element ? anchor : anchor ? "virtual" : null;
  React.useLayoutEffect(() => {
    setPositionReference(key instanceof Element || key === null ? key : { getBoundingClientRect: () => anchorRect(latest.current) ?? domReference.current?.getBoundingClientRect() ?? new DOMRect() });
  }, [key, setPositionReference, domReference]);
  const live = { placement: floating.placement, style: { position: floating.strategy, top: floating.y, left: floating.x, zIndex: 50, "--transform-origin": floating.middlewareData.transformOrigin?.origin } as React.CSSProperties };
  // Closing (the exit animation) and a hidden reference keep the last position
  const held = React.useRef(live);
  if (options.open && !floating.middlewareData.transformOrigin?.detached) held.current = live;
  const state = (open: boolean): PopoverContentState => ({ open, side: placedSide(side, held.current.placement.split("-")[0], rtl), align });
  return { ...floating, state, style: held.current.style };
}

const portal = (content: React.ReactElement, container: HTMLElement | false | undefined) => (container === false ? content : <FloatingPortal root={container}>{content}</FloatingPortal>);

const Content = React.forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  { side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, container, anchor, initialFocus, finalFocus, className, style, render, children, ...props },
  ref,
) {
  const p = usePopoverInternals<Internals>("Content");
  const { context, state: stateOf, style: position } = usePlacement({ side, align, sideOffset, collisionPadding, anchor }, { rootContext: p.context, nodeId: p.nodeId, open: p.state.open });
  const node = React.useRef<HTMLDivElement | null>(null);
  const status = useTransition(p.state.open, node, p.state.complete);
  const mergedRef = useMergeRefs([node, p.setFloating, ref]);
  const latest = React.useRef({ initialFocus, finalFocus, p });
  latest.current = { initialFocus, finalFocus, p };
  const [focusTarget] = React.useState(
    () =>
      ({
        get current() {
          return initialFocusTarget(latest.current.initialFocus, node.current);
        },
      }) as React.MutableRefObject<HTMLElement | null>,
  );
  const [returnTarget] = React.useState(
    () =>
      ({
        get current() {
          const { finalFocus, p } = latest.current;
          return finalFocus && p.state.selected.current ? finalFocusTarget(finalFocus) : p.trigger;
        },
      }) as React.MutableRefObject<HTMLElement | null>,
  );
  const state = stateOf(p.state.open);
  const attributes = useContentAttributes(props);
  if (!status) return null;
  return portal(
    <FloatingFocusManager context={context} modal={p.modal} disabled={!p.state.open} initialFocus={initialFocus === false ? -1 : focusTarget} returnFocus={finalFocus ? returnTarget : true}>
      {renderElement(
        "div",
        {
          ...p.floatingProps(mergePartProps(props)),
          ...attributes,
          ...stateAttributes(state, status),
          ref: mergedRef,
          className,
          style: (s: PopoverContentState) => ({ ...position, ...resolve(style, s) }),
          render,
          children: <ContentFocus initialFocus={initialFocus}>{children}</ContentFocus>,
        },
        state,
      )}
    </FloatingFocusManager>,
    container,
  );
});

function SuggestionsPopover({ open, onOpenChange, onOpenChangeComplete, anchor, side = "bottom", align = "start", sideOffset = 4, collisionPadding = 8, container, className, style, render, children, ...props }: SuggestionsPopoverProps) {
  const placement = usePlacement({ side, align, sideOffset, collisionPadding, anchor }, { open, onOpenChange: (next, event, reason) => onOpenChange?.(next, createChangeDetails(reasonOf(reason), event)) });
  const { getFloatingProps } = useInteractions([useDismiss(placement.context, { escapeKey: false })]);
  const node = React.useRef<HTMLDivElement | null>(null);
  const status = useTransition(open, node, onOpenChangeComplete);
  const refs = useMergeRefs([node, placement.refs.setFloating]);
  if (!status) return null;
  const state = placement.state(open);
  return portal(
    renderElement(
      "div",
      {
        ...getFloatingProps(mergePartProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() })),
        ...stateAttributes(state, status),
        ref: refs,
        "data-slot": SLOTS.suggestions,
        className,
        style: (s: SuggestionsPopoverState) => ({ ...placement.style, ...resolve(style, s) }),
        render,
        children,
      },
      state,
    ),
    container,
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
