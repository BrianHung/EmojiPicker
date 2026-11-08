import type * as React from "react";
import { shallowEqual } from "@brianhung/emoji-picker-core/internal";
import * as EmojiPickerRootCssVars from "../../root/EmojiPickerRootCssVars";
import * as EmojiPickerListCssVars from "../EmojiPickerListCssVars";
import { DEFAULT_METRICS, type GridMetrics } from "./layout";

// A hidden box sized by the same variables as the cells, so the layout reads them as numbers
export const PROBE: React.CSSProperties = {
  position: "absolute",
  visibility: "hidden",
  pointerEvents: "none",
  boxSizing: "content-box",
  top: 0,
  left: 0,
  width: `var(${EmojiPickerRootCssVars.emojiCellWidth}, var(--ep-cell))`,
  height: `var(${EmojiPickerRootCssVars.emojiCellHeight}, var(--ep-cell))`,
  paddingTop: "var(--ep-header)",
  paddingLeft: "var(--ep-pad)",
  paddingRight: `var(${EmojiPickerListCssVars.sectionGap}, var(--ep-pad))`,
  paddingBottom: `var(${EmojiPickerListCssVars.sectionMinWidth}, 0px)`,
  marginRight: `var(${EmojiPickerListCssVars.listPaddingEnd}, var(--ep-pad))`,
};

// Blink lays out in 1/64 px units; rows snapped to them stack without subpixel seams
const LAYOUT_UNITS_PER_PX = 64;
// Past a CSS zoom, rounding back out of zoomed units can land a hair below the unit
const ZOOM_EPSILON = 1e-6;
const METRICS_TOLERANCE = 0.01;

export function layoutUnits(el: HTMLElement) {
  const zoom = (el as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom || 1;
  const snap = (n: number) => Math.trunc(n * LAYOUT_UNITS_PER_PX) / LAYOUT_UNITS_PER_PX;
  return (n: number) => (zoom === 1 ? snap(n) : snap(n * zoom) / zoom + ZOOM_EPSILON);
}

export function readProbe(probe: HTMLElement): GridMetrics {
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  const unit = layoutUnits(probe);
  return {
    cellWidth: px(cs.width) || DEFAULT_METRICS.cellWidth,
    cellHeight: unit(px(cs.height)) || DEFAULT_METRICS.cellHeight,
    headerHeight: unit(px(cs.paddingTop)),
    padding: px(cs.paddingLeft),
    paddingEnd: px(cs.marginRight),
    sectionGap: px(cs.paddingRight),
    sectionMinWidth: px(cs.paddingBottom),
  };
}

export const sameMetrics = (a: GridMetrics, b: GridMetrics) => shallowEqual(a, b, (x, y) => Math.abs(x - y) < METRICS_TOLERANCE);
