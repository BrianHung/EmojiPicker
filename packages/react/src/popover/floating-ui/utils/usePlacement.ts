"use client";

import * as React from "react";
import { autoUpdate, flip, type Middleware, offset, type OpenChangeReason, shift, size, type UseFloatingOptions, useFloating } from "@floating-ui/react";
import { useLocale } from "react-aria/I18nProvider";
import { shallowEqual } from "@emoji-components/core/internal";
import { useLatest } from "../../../utils/useLatest";
import { useLayoutEffect } from "../../../utils/useLayoutEffect";
import * as EmojiPopoverPositionerCssVars from "../../positioner/EmojiPopoverPositionerCssVars";
import { anchorElement, anchorRect, physicalSide, placedSide } from "../../utils/elements";
import type { EmojiPopoverPositionerProps, EmojiPopoverPositionerState, EmojiPopoverRootChangeEventReason, Placement } from "../../utils/types";

export type FloatingProps = (props: React.HTMLAttributes<HTMLElement>) => Record<string, unknown>;

type Placed = { placement: string; position: React.CSSProperties["position"]; top: React.CSSProperties["top"]; left: React.CSSProperties["left"]; origin: string | undefined };

const REASONS: Partial<Record<OpenChangeReason, EmojiPopoverRootChangeEventReason>> = {
  "outside-press": "outside-press",
  "escape-key": "escape-key",
  "focus-out": "focus-out",
  "ancestor-scroll": "scroll",
  "reference-press": "trigger-press",
  click: "trigger-press",
};
export const reasonOf = (reason: OpenChangeReason | undefined) => (reason && REASONS[reason]) || "none";

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

export function usePlacement({ side, align, sideOffset, alignOffset, collisionPadding, anchor }: Placement & Pick<EmojiPopoverPositionerProps, "anchor">, options: UseFloatingOptions) {
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
          style.setProperty(EmojiPopoverPositionerCssVars.availableWidth, `${Math.round(availableWidth)}px`);
          style.setProperty(EmojiPopoverPositionerCssVars.availableHeight, `${Math.round(availableHeight)}px`);
          style.setProperty(EmojiPopoverPositionerCssVars.anchorWidth, `${Math.round(rects.reference.width)}px`);
          style.setProperty(EmojiPopoverPositionerCssVars.anchorHeight, `${Math.round(rects.reference.height)}px`);
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
  // Closing (the exit animation) and a hidden reference keep the last position a fresh commit showed
  const [held, setHeld] = React.useState(live);
  const fresh = options.open && !floating.middlewareData.transformOrigin?.detached;
  useLayoutEffect(() => {
    if (fresh) setHeld((prev) => (shallowEqual(prev, live) ? prev : live));
  });
  const shown = fresh ? live : held;
  const state: EmojiPopoverPositionerState = { open: !!options.open, side: placedSide(side, shown.placement.split("-")[0], rtl), align };
  return {
    context: floating.context,
    setFloating: floating.refs.setFloating,
    state,
    style: { position: shown.position, top: shown.top, left: shown.left, zIndex: 50, [EmojiPopoverPositionerCssVars.transformOrigin]: shown.origin } as React.CSSProperties,
  };
}

export type PlacementResult = ReturnType<typeof usePlacement>;
