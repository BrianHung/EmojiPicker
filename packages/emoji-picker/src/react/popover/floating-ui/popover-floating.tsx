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
  useTransitionStatus,
  type FloatingRootContext,
  type Middleware,
  type UseFloatingOptions,
} from "@floating-ui/react";
import { mergeProps } from "react-aria/mergeProps";
import { resolve } from "../../utils/render";
import {
  anchorRect,
  ContentFocus,
  contentAttributes,
  finalFocusTarget,
  initialFocusTarget,
  PopoverProvider,
  Trigger,
  usePopoverInternals,
  usePopoverState,
  type PopoverAnchor,
  type PopoverContentProps as SharedContentProps,
  type PopoverInternals,
  type PopoverPlacementProps,
  type Side,
  type PopoverRootProps,
  type SuggestionsPopoverProps,
} from "../popover-shared";

export type PopoverContentProps = SharedContentProps & {
  duration?: number | { open?: number; close?: number };
};

type Internals = PopoverInternals & {
  context: FloatingRootContext;
  nodeId?: string;
  setFloating: (el: HTMLElement | null) => void;
  floatingProps: (props: React.HTMLAttributes<HTMLElement>) => Record<string, unknown>;
};

function Root(props: PopoverRootProps) {
  const node = <RootNode {...props} />;
  return useFloatingParentNodeId() === null ? <FloatingTree>{node}</FloatingTree> : node;
}

function RootNode({ children, ...props }: PopoverRootProps) {
  const state = usePopoverState(props);
  const nodeId = useFloatingNodeId();
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const [floating, setFloating] = React.useState<HTMLElement | null>(null);
  const context = useFloatingRootContext({ open: state.open, onOpenChange: state.setOpen, elements: { reference: trigger, floating } });
  const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context), useRole(context)]);
  const value: Internals = { state, trigger, setTrigger, triggerProps: getReferenceProps, context, nodeId, setFloating, floatingProps: getFloatingProps };
  return (
    <PopoverProvider value={value}>
      <FloatingNode id={nodeId}>{children}</FloatingNode>
    </PopoverProvider>
  );
}

const transformOrigin: Middleware = {
  name: "transformOrigin",
  fn: ({ x, y, placement, rects: { reference: r, floating: f } }) => ({
    data: { origin: `${Math.round(Math.min(Math.max(r.x + r.width / 2 - x, 0), f.width))}px ${Math.round((placement.startsWith("top") ? r.y : r.y + r.height) - y)}px` },
  }),
};

function usePlacement({ side = "bottom", align = "start", sideOffset, collisionPadding = 8, anchor }: PopoverPlacementProps & { anchor?: PopoverAnchor }, options: UseFloatingOptions) {
  const floating = useFloating({
    ...options,
    strategy: "fixed",
    placement: align === "center" ? side : `${side}-${align}`,
    transform: false,
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
  return { ...floating, side: floating.placement.split("-")[0] as Side, style: { position: floating.strategy, top: floating.y, left: floating.x } as const };
}

const portal = (content: React.ReactElement, container: HTMLElement | false | undefined) => (container === false ? content : <FloatingPortal root={container}>{content}</FloatingPortal>);

const Content = React.forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  { side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, container, anchor, initialFocus, finalFocus, duration = 0, className, style, children, ...props },
  ref,
) {
  const p = usePopoverInternals<Internals>("Content");
  const { context, middlewareData, side: placed, style: position } = usePlacement({ side, align, sideOffset, collisionPadding, anchor }, { rootContext: p.context, nodeId: p.nodeId, open: p.state.open });
  const { isMounted, status } = useTransitionStatus(context, { duration });
  const node = React.useRef<HTMLDivElement | null>(null);
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

  if (!isMounted) return null;
  const state = { open: p.state.open, side: placed, align };
  return portal(
    <FloatingFocusManager context={context} modal={false} disabled={!p.state.open} initialFocus={initialFocus === false ? -1 : focusTarget} returnFocus={finalFocus ? returnTarget : true}>
      <div
        {...p.floatingProps(props)}
        {...contentAttributes({ ...state, status: status === "close" ? "ending" : status === "open" ? "open" : "starting", props })}
        ref={mergedRef}
        className={resolve(className, state)}
        style={{ ...position, zIndex: 50, "--transform-origin": middlewareData.transformOrigin?.origin, ...resolve(style, state) } as React.CSSProperties}
      >
        <ContentFocus initialFocus={initialFocus}>{children}</ContentFocus>
      </div>
    </FloatingFocusManager>,
    container,
  );
});

function SuggestionsPopover({ open, onOpenChange, anchor, side = "bottom", align = "start", sideOffset = 4, collisionPadding = 8, container, style, children, ...props }: SuggestionsPopoverProps) {
  const { refs, context, side: placed, style: position } = usePlacement({ side, align, sideOffset, collisionPadding, anchor }, { open, onOpenChange: (next) => onOpenChange?.(next) });
  const { getFloatingProps } = useInteractions([useDismiss(context, { escapeKey: false })]);
  if (!open) return null;
  return portal(
    <div
      {...getFloatingProps(mergeProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }))}
      ref={refs.setFloating}
      data-slot="suggestions-popover"
      data-side={placed}
      data-align={align}
      style={{ ...position, zIndex: 50, ...style }}
    >
      {children}
    </div>,
    container,
  );
}

export const EmojiPopover = { Root, Trigger, Content };
export const EmojiSuggestions = { Popover: SuggestionsPopover };
