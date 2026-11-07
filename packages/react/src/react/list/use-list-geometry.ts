"use client";

import * as React from "react";
import type { Rect } from "react-stately/useVirtualizerState";
import type { GridGeometry } from "../grid/types";
import type { EmojiGridLayout } from "./layout";
import type { GridKeyboardDelegate } from "./navigation";
import { HIDDEN_OVERLAY, variationsOverlay } from "./overlay";
import { visibleRect as liveRect } from "./virtualizer";

const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// The List's grid on screen, through its layout; scrolls go to the Viewport
export function useListGeometry(layout: EmojiGridLayout, navigation: GridKeyboardDelegate, listRef: React.RefObject<HTMLElement | null>, scroller: () => HTMLElement | null, rtl: { readonly current: boolean }) {
  // A jump's target section, until the smooth scroll gets there
  const jumping = React.useRef<Rect | null>(null);
  const geometry = React.useMemo<GridGeometry>(() => {
    const { axis } = layout;
    const visibleRect = () => {
      const el = scroller();
      const list = listRef.current;
      return el && list ? liveRect(el, list, axis.horizontal, rtl.current) : null;
    };
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
  }, [layout, navigation, scroller, listRef, rtl]);

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
