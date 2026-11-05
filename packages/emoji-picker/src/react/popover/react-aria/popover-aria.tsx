import * as React from "react";
import { createPortal } from "react-dom";
import { Popover, type PopoverRenderProps } from "react-aria-components/Popover";
import { mergeProps } from "react-aria/mergeProps";
import { resolve } from "../../utils/render";
import { useOverlayTrigger } from "react-aria/useOverlayTrigger";
import { useOverlayTriggerState } from "react-stately/useOverlayTriggerState";
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
  type Align,
  type PopoverAnchor,
  type PopoverContentProps,
  type PopoverInitialFocus,
  type PopoverInternals,
  type PopoverRootProps,
  type Side,
  type SuggestionsPopoverProps,
} from "../popover-shared";

type Internals = PopoverInternals & { id?: string };

function Root({ children, ...props }: PopoverRootProps) {
  const state = usePopoverState(props);
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const overlay = useOverlayTriggerState({ isOpen: state.open, onOpenChange: state.setOpen });
  const { triggerProps, overlayProps } = useOverlayTrigger({ type: "dialog" }, overlay, { current: trigger });
  const { onPress: _, ...aria } = triggerProps;
  const value: Internals = { state, trigger, setTrigger, triggerProps: (props) => mergeProps(props, aria), id: overlayProps.id };
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

const placementOf = (side: Side, align: Align) => (align === "center" ? side : (`${side} ${align}` as const));

function InitialFocus({ initialFocus, content }: { initialFocus?: PopoverInitialFocus; content: React.RefObject<HTMLElement | null> }) {
  React.useEffect(() => void initialFocusTarget(initialFocus, content.current)?.focus({ preventScroll: true }), []);
  return null;
}

const Content = React.forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  { side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, container, anchor, initialFocus, finalFocus, className, style, children, ...rest },
  ref,
) {
  const { duration: _duration, ...props } = rest as typeof rest & { duration?: unknown };
  const p = usePopoverInternals<Internals>("Content");
  const wasOpen = React.useRef(p.state.open);
  React.useEffect(() => {
    if (wasOpen.current && !p.state.open && finalFocus && p.state.selected.current) finalFocusTarget(finalFocus)?.focus({ preventScroll: true });
    wasOpen.current = p.state.open;
  }, [p.state.open]);
  const [anchorElement, triggerRef] = useAnchorRef(anchor, p.trigger);
  const node = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => node.current!);
  return (
    <>
      {anchorElement}
      <Popover
        ref={node}
        triggerRef={triggerRef}
        isOpen={p.state.open}
        onOpenChange={p.state.setOpen}
        placement={placementOf(side, align)}
        offset={sideOffset}
        containerPadding={collisionPadding}
        UNSTABLE_portalContainer={container || undefined}
        className={(values) => resolve(className, stateOf(values, p.state.open, side, align)) ?? ""}
        style={(values) => resolve(style, stateOf(values, p.state.open, side, align))}
        render={(dom, values) => (
          <div
            {...mergeProps(props, contentAttributes({ ...stateOf(values, p.state.open, side, align), status: statusOf(values), props }), dom, { id: p.id })}
            style={{ "--transform-origin": dom.style?.["--trigger-anchor-point" as never], "--available-height": maxHeightOf(dom.style), ...dom.style } as React.CSSProperties}
          />
        )}
      >
        <InitialFocus initialFocus={initialFocus} content={node} />
        <ContentFocus initialFocus={initialFocus}>{children}</ContentFocus>
      </Popover>
    </>
  );
});

const stateOf = ({ placement }: PopoverRenderProps, open: boolean, side: Side, align: Align) => ({ open, side: placement === "top" || placement === "bottom" ? placement : side, align });
const statusOf = ({ isEntering, isExiting }: PopoverRenderProps) => (isEntering ? "starting" : isExiting ? "ending" : "open");
const maxHeightOf = (style: React.CSSProperties | undefined) => (typeof style?.maxHeight === "number" ? `${style.maxHeight}px` : style?.maxHeight);

function SuggestionsPopover({ open, onOpenChange, anchor, side = "bottom", align = "start", sideOffset = 4, collisionPadding = 8, container, className, style, children, ...props }: SuggestionsPopoverProps) {
  const [anchorElement, triggerRef] = useAnchorRef(anchor, null);
  return (
    <>
      {anchorElement}
      <Popover
        isNonModal
        triggerRef={triggerRef}
        isOpen={open}
        onOpenChange={(next) => onOpenChange?.(next)}
        placement={placementOf(side, align)}
        offset={sideOffset}
        containerPadding={collisionPadding}
        UNSTABLE_portalContainer={container || undefined}
        className={className}
        style={style}
        render={(dom, { placement }) => <div {...mergeProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }, dom)} data-slot="suggestions-popover" data-side={placement ?? side} data-align={align} />}
      >
        {children}
      </Popover>
    </>
  );
}

export const EmojiPopover = { Root, Trigger, Content };
export const EmojiSuggestions = { Popover: SuggestionsPopover };
