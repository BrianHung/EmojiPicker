"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Popover, type PopoverRenderProps } from "react-aria-components/Popover";
import { useLocale } from "react-aria/I18nProvider";
import { useObjectRef } from "react-aria/useObjectRef";
import { useInteractOutside } from "react-aria/useInteractOutside";
import { createChangeDetails } from "@emoji-components/core/internal";
import { mergePartProps } from "../../../internals/mergePartProps";
import { resolve, toRenderFunction } from "../../../internals/renderElement";
import type { ElementProps } from "../../../internals/types";
import { useLatest } from "../../../utils/useLatest";
import { useLayoutEffect } from "../../../utils/useLayoutEffect";
import * as EmojiPopoverPositionerCssVars from "../../positioner/EmojiPopoverPositionerCssVars";
import { anchorRect, containerOf, placedSide } from "../../utils/elements";
import { closedPointerEvents, positionerAttributes } from "../../utils/popupAttributes";
import type {
  EmojiPopoverAlign,
  EmojiPopoverAnchor,
  EmojiPopoverPositionerProps,
  EmojiPopoverPositionerState,
  EmojiPopoverRootChangeEventDetails,
  EmojiPopoverRootChangeEventReason,
  EmojiPopoverSide,
  Placement,
  TransitionStatus,
} from "../../utils/types";
import { EmojiPopoverPortalContext } from "../portal/EmojiPopoverPortalContext";
import { EmojiPopoverPositionerContext } from "../positioner/EmojiPopoverPositionerContext";

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
      : { current: anchor ? (anchor as Element) : fallback };
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
  return {
    [EmojiPopoverPositionerCssVars.anchorWidth]: `${Math.round(r.width)}px`,
    [EmojiPopoverPositionerCssVars.anchorHeight]: `${Math.round(r.height)}px`,
    [EmojiPopoverPositionerCssVars.availableWidth]: `${Math.max(0, Math.round(available))}px`,
  };
};

export type Overlay = {
  open: boolean;
  modal: boolean;
  fallback: Element | null;
  onOpenChange: (open: boolean, details: EmojiPopoverRootChangeEventDetails) => void;
  complete?: (open: boolean) => void;
  slot: string;
};

export function usePositioner(
  { open, modal, fallback, onOpenChange, complete, slot }: Overlay,
  { side, align, sideOffset, alignOffset, collisionPadding, anchor, className, style, render, children, ...props }: Placement & EmojiPopoverPositionerProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const container = React.useContext(EmojiPopoverPortalContext);
  const rtl = useLocale().direction === "rtl";
  const [anchorElement, triggerRef] = useAnchorRef(anchor, fallback);
  const node = useObjectRef(ref);
  const dismiss = useDismiss(open, modal, node, triggerRef, (details) => onOpenChange(false, details));
  const custom = toRenderFunction(render);
  const stateOf = ({ placement }: PopoverRenderProps): EmojiPopoverPositionerState => ({ open, side: placedSide(side, placement, rtl), align });
  return (
    <>
      {anchorElement}
      <Popover
        ref={node}
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
              [EmojiPopoverPositionerCssVars.transformOrigin]: anchorPoint(dom.style),
              [EmojiPopoverPositionerCssVars.availableHeight]: maxHeightOf(dom.style),
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
            <EmojiPopoverPositionerContext.Provider value={{ state, status: statusOf(values) }}>
              <Mounted entering={values.isEntering} complete={complete} />
              {resolve(children, state)}
            </EmojiPopoverPositionerContext.Provider>
          );
        }}
      </Popover>
    </>
  );
}
