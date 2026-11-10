"use client";

import * as React from "react";
import type { Key } from "@react-types/shared";
import { mergeProps } from "react-aria/mergeProps";
import type { EmojiSection } from "@emoji-components/core";
import { createEmojiGrid, type EmojiGrid, type EmojiGridRow } from "@emoji-components/core/grid";
import type { GridGeometry } from "./types";
import { useGridController } from "./useGridController";
import { useGridSections } from "./useGridSections";
import { useEmojiPickerRootContext } from "../../root/EmojiPickerRootContext";
import { mergePartProps } from "../../../internals/mergePartProps";
import { useLatest, useStableCallback } from "../../../utils/useLatest";
import { SLOTS } from "../../../internals/slots";
import { scrollParent } from "../../../utils/dom";
import { useLayoutEffect } from "../../../utils/useLayoutEffect";
import { gridKeyboardDelegate } from "./navigation";
import { HIDDEN_OVERLAY, variationsOverlay } from "./overlay";
import { gridStateOf, type EmojiPickerGridState } from "../../list-cell/utils/useEmojiPickerCell";

export interface UseEmojiPickerGridOptions {
  columns?: number;
  rowHeight: number;
  headerHeight?: number;
  scrollToIndex?: (index: number, options: { align: "start" | "end" }) => void;
  "aria-label"?: string;
}

type GridElementProps = React.HTMLAttributes<HTMLElement> & { ref: React.RefCallback<HTMLElement> };

export type UseEmojiPickerGridReturnValue = EmojiGrid<EmojiSection> & {
  getGridProps(props?: React.HTMLAttributes<HTMLElement>): GridElementProps;
  getHeaderProps(section: EmojiSection, props?: React.HTMLAttributes<HTMLElement>): React.HTMLAttributes<HTMLElement>;
  state: EmojiPickerGridState;
  variations: React.ReactNode;
};

// Default columns when neither the hook nor the Root gives any
const DEFAULT_COLUMNS = 9;

function windowOf(list: HTMLElement | null) {
  const el = scrollParent(list);
  return list && el ? { el, top: el.getBoundingClientRect().top + el.clientTop - list.getBoundingClientRect().top, height: el.clientHeight } : null;
}

// The grid inside an app's own virtualizer: rows to render, and geometry read from the DOM
export function useEmojiPickerGrid({ columns, rowHeight, headerHeight = rowHeight, scrollToIndex, "aria-label": label }: UseEmojiPickerGridOptions): UseEmojiPickerGridReturnValue {
  const picker = useEmojiPickerRootContext("useEmojiPickerGrid");
  const { sections, request } = useGridSections(false);
  const grid = React.useMemo(() => createEmojiGrid(sections, { columns: columns ?? picker.columns ?? DEFAULT_COLUMNS, rowHeight, headerHeight }), [sections, columns, picker.columns, rowHeight, headerHeight]);
  const listRef = React.useRef<HTMLElement | null>(null);
  const latest = useLatest({ grid, rowHeight, headerHeight, scrollToIndex });
  const navigation = React.useMemo(() => gridKeyboardDelegate(() => ({ grid: latest.current.grid, strip: null, metrics: { cellHeight: latest.current.rowHeight, headerHeight: latest.current.headerHeight } })), [latest]);
  const geometry = React.useMemo<GridGeometry>(() => {
    const rowOf = (key: Key) => grid.locate(grid.indexOf(String(key)))?.row ?? -1;
    const scroll = (index: number, align: "start" | "end") => {
      const v = windowOf(listRef.current);
      const row = grid.rows[index];
      if (latest.current.scrollToIndex) latest.current.scrollToIndex(index, { align });
      else if (v && row) v.el.scrollTop += align === "start" ? row.offset - v.top : row.offset + row.size - v.top - v.height;
    };
    const visible = (r: EmojiGridRow, inset = 0) => {
      const v = windowOf(listRef.current);
      return Boolean(v && r.offset + r.size > v.top + inset && r.offset < v.top + v.height);
    };
    return {
      grid: () => grid,
      navigation,
      firstVisible() {
        const row = grid.rows.find((r) => r.type === "emojis" && visible(r, (r.section.header ? headerHeight : 0) + 1));
        return row?.type === "emojis" ? row.items[0]!.id : (grid.at(0)?.id ?? null);
      },
      isVisible: (key) => Boolean(grid.rows[rowOf(key)] && visible(grid.rows[rowOf(key)]!)),
      reveal(key) {
        const index = rowOf(key);
        const v = windowOf(listRef.current);
        const row = grid.rows[index];
        if (!v || !row) return;
        if (row.offset < v.top) scroll(grid.rows[index - 1]?.type === "header" ? index - 1 : index, "start");
        else if (row.offset + row.size > v.top + v.height) scroll(index, "end");
      },
      viewport: () => windowOf(listRef.current)?.height ?? 0,
      jump(id) {
        const index = grid.rows.findIndex((r) => r.section.id === id);
        if (index >= 0) scroll(index, "start");
        return index >= 0;
      },
      overlay(_, cell) {
        const list = listRef.current;
        if (!list || !cell) return HIDDEN_OVERLAY;
        const [l, c] = [list.getBoundingClientRect(), cell.getBoundingClientRect()];
        return variationsOverlay({ x: c.left - l.left, y: c.top - l.top, width: c.width, height: c.height }, l.width, windowOf(list)?.top ?? 0, list);
      },
    };
  }, [grid, headerHeight, navigation, latest]);
  const controller = useGridController({ sections, geometry, orientation: "vertical", listRef, request, "aria-label": label });

  const sync = useStableCallback(() => {
    const v = windowOf(listRef.current);
    const shown = v ? grid.rows.filter((r) => r.offset + r.size > v.top && r.offset < v.top + v.height) : [];
    controller.afterRender({ unifieds: shown.flatMap((r) => (r.type === "emojis" ? r.items.map((i) => i.unified) : [])), section: shown[0]?.section.id, settled: true });
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: sync reads the latest grid; a new one is what makes it run
  useLayoutEffect(() => sync(), [sync, grid]);
  // The app's virtualizer owns the scroller
  React.useEffect(() => {
    const el = windowOf(listRef.current)?.el;
    el?.addEventListener("scroll", sync, { passive: true });
    return () => el?.removeEventListener("scroll", sync);
  }, [sync]);

  const state = React.useMemo(() => gridStateOf(controller.cells), [controller.cells]);
  return {
    ...grid,
    getGridProps: (props = {}) => mergePartProps(props, controller.gridProps),
    getHeaderProps: (section, props = {}) => mergeProps(props, { role: "presentation", "data-slot": SLOTS.listSectionTitle, children: section.name }),
    state,
    variations: controller.variations,
  };
}
