"use client";

import * as React from "react";
import type { Rect, VirtualizerState } from "react-stately/useVirtualizerState";
import type { GridGeometry } from "../grid/types";
import type { CollectionNode } from "./collection";
import type { EmojiGridLayout } from "./layout";
import type { GridKeyboardDelegate } from "./navigation";
import { HIDDEN_OVERLAY, variationsOverlay } from "./overlay";

const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// The List's grid on screen, through its layout and React Aria's virtualizer; scrolls go to the Viewport
export function useListGeometry(
  layout: EmojiGridLayout,
  navigation: GridKeyboardDelegate,
  listRef: React.RefObject<HTMLElement | null>,
  scroller: () => HTMLElement | null,
  virtualizer: React.RefObject<VirtualizerState<CollectionNode, React.ReactNode> | null>,
  rtl: { readonly current: boolean },
) {
  // A jump's target section, until the smooth scroll gets there
  const jumping = React.useRef<Rect | null>(null);
  const geometry = React.useMemo<GridGeometry>(() => {
    const visibleRect = () => virtualizer.current?.virtualizer.visibleRect ?? null;
    const { axis } = layout;
    const sign = () => (axis.horizontal && rtl.current ? -1 : 1);
    return {
      grid: () => layout.grid,
      navigation,
      layoutDelegate: layout,
      isVisible(key) {
        const rect = visibleRect();
        return Boolean(rect && layout.isVisible(key, rect));
      },
      firstVisible() {
        const rect = visibleRect();
        return (rect && layout.firstVisible(rect)) ?? navigation.getFirstKey();
      },
      reveal(key, from) {
        const el = scroller();
        const seen = visibleRect();
        const info = layout.getLayoutInfo(key);
        if (!el || !seen || !info) return;
        const s = sign();
        const a = from != null ? layout.getLayoutInfo(from)?.rect : null;
        const before = el[axis.scroll];
        if (a) el[axis.scroll] += (layout.start(info.rect) - layout.start(a)) * s;
        const shown = seen.copy();
        shown[axis.start] += (el[axis.scroll] - before) * s;
        const by = layout.revealBy(key, info.rect, shown);
        if (by != null) el[axis.scroll] += s * by;
      },
      viewport() {
        const el = scroller();
        return el ? el[axis.client] : 0;
      },
      jump(id, instant) {
        const el = scroller();
        const rect = visibleRect();
        const info = layout.getLayoutInfo(id);
        if (!el || !rect || !info) return false;
        jumping.current = info.rect;
        el.scrollBy({ [axis.by]: (layout.jumpTarget(info.rect, el[axis.client]) - layout.start(rect)) * sign(), behavior: instant || prefersReducedMotion() ? "auto" : "smooth" });
        return true;
      },
      overlay(key) {
        const cell = layout.getLayoutInfo(key)?.rect;
        const list = listRef.current;
        return cell && list ? variationsOverlay(cell, layout.getContentSize().width, visibleRect()?.y ?? 0, list) : HIDDEN_OVERLAY;
      },
    };
  }, [layout, navigation, scroller, listRef, virtualizer, rtl]);

  // True once a jump's smooth scroll has reached its section, or there was none
  const settled = React.useCallback(
    (rect: Rect) => {
      const target = jumping.current;
      if (!target) return true;
      const { size } = layout.axis;
      const max = layout.getContentSize()[size] - rect[size];
      if (Math.abs(layout.start(rect) - Math.max(0, Math.min(layout.jumpTarget(target, rect[size]), max))) > 1) return false;
      jumping.current = null;
      return true;
    },
    [layout],
  );
  return { geometry, settled };
}
