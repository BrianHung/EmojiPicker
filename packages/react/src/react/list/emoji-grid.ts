import * as React from "react";
import type { Key } from "@react-types/shared";
import { mergeProps } from "react-aria/mergeProps";
import { createEmojiGrid, type EmojiGridRow, type EmojiSection } from "@brianhung/emoji-picker-core";
import { usePicker } from "../root/context";
import { SLOTS } from "../utils/slots";
import { scrollParent } from "../utils/utils";
import type { EmojiGridState } from "./cell";
import { useGridController, useGridSections, type GridGeometry } from "./grid";
import { EmojiGridNavigation } from "./navigation";

export type UseEmojiGridOptions = {
  columns?: number;
  rowHeight: number;
  headerHeight?: number;
  scrollToIndex?: (index: number, options: { align: "start" | "end" }) => void;
  "aria-label"?: string;
};

function windowOf(list: HTMLElement | null) {
  const el = scrollParent(list);
  return list && el ? { el, top: el.getBoundingClientRect().top + el.clientTop - list.getBoundingClientRect().top, height: el.clientHeight } : null;
}

export function useEmojiGrid({ columns, rowHeight, headerHeight = rowHeight, scrollToIndex, "aria-label": label }: UseEmojiGridOptions) {
  const picker = usePicker("useEmojiGrid");
  const { sections, request, probeRoot } = useGridSections(false);
  const grid = React.useMemo(() => createEmojiGrid(sections, { columns: columns ?? picker.columns ?? 9, rowHeight, headerHeight }), [sections, columns, picker.columns, rowHeight, headerHeight]);
  const listRef = React.useRef<HTMLElement | null>(null);
  const latest = React.useRef({ grid, rowHeight, headerHeight, scrollToIndex });
  latest.current = { grid, rowHeight, headerHeight, scrollToIndex };
  const [geometry] = React.useState<GridGeometry>(() => {
    const g = () => latest.current.grid;
    const rowOf = (key: Key) => g().locate(g().indexOf(String(key)))?.row ?? -1;
    const scroll = (index: number, align: "start" | "end") => {
      const v = windowOf(listRef.current);
      const row = g().rows[index];
      if (latest.current.scrollToIndex) latest.current.scrollToIndex(index, { align });
      else if (v && row) v.el.scrollTop += align === "start" ? row.offset - v.top : row.offset + row.size - v.top - v.height;
    };
    const visible = (r: EmojiGridRow, inset = 0) => {
      const v = windowOf(listRef.current);
      return Boolean(v && r.offset + r.size > v.top + inset && r.offset < v.top + v.height);
    };
    return {
      grid: g,
      navigation: new EmojiGridNavigation(() => ({ grid: g(), strip: null, metrics: { cellHeight: latest.current.rowHeight, headerHeight: latest.current.headerHeight } })),
      firstVisible() {
        const row = g().rows.find((r) => r.type === "emojis" && visible(r, (r.section.header ? latest.current.headerHeight : 0) + 1));
        return row?.type === "emojis" ? row.items[0]!.id : (g().at(0)?.id ?? null);
      },
      isVisible: (key) => Boolean(g().rows[rowOf(key)] && visible(g().rows[rowOf(key)]!)),
      reveal(key) {
        const index = rowOf(key);
        const v = windowOf(listRef.current);
        const row = g().rows[index];
        if (!v || !row) return;
        if (row.offset < v.top) scroll(g().rows[index - 1]?.type === "header" ? index - 1 : index, "start");
        else if (row.offset + row.size > v.top + v.height) scroll(index, "end");
      },
      viewport: () => windowOf(listRef.current)?.height ?? 0,
      jump(id) {
        const index = g().rows.findIndex((r) => r.section.id === id);
        if (index >= 0) scroll(index, "start");
        return index >= 0;
      },
      overlay(_, cell) {
        const list = listRef.current;
        if (!list || !cell) return { position: "absolute", visibility: "hidden" };
        const [l, c] = [list.getBoundingClientRect(), cell.getBoundingClientRect()];
        const above = c.top - l.top - c.height;
        const left = Math.max(0, Math.min(c.left - l.left - 2.5 * c.width, l.width - 6 * c.width));
        return { position: "absolute", top: list.offsetTop + (above >= (windowOf(list)?.top ?? 0) ? above : c.bottom - l.top), insetInlineStart: list.offsetLeft + left };
      },
    };
  });
  const controller = useGridController({ sections, geometry, orientation: "vertical", listRef, probeRoot, "aria-label": label });

  const sync = React.useRef(() => {});
  sync.current = () => {
    controller.applyHighlight();
    controller.syncStop();
    const v = windowOf(listRef.current);
    const shown = v ? grid.rows.filter((r) => r.offset + r.size > v.top && r.offset < v.top + v.height) : [];
    request(shown.flatMap((r) => (r.type === "emojis" ? r.items.map((i) => i.unified) : [])));
    if (!picker.searching && shown[0]) picker.state.setActiveSection(shown[0].section.id);
    controller.flushJump();
  };
  React.useLayoutEffect(() => sync.current());
  // The app's virtualizer owns the scroller
  React.useEffect(() => {
    const el = windowOf(listRef.current)?.el;
    const onScroll = () => sync.current();
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => el?.removeEventListener("scroll", onScroll);
  }, []);

  return {
    ...grid,
    getGridProps: (props: React.HTMLAttributes<HTMLElement> = {}) => mergeProps(props, controller.gridProps) as typeof controller.gridProps,
    getHeaderProps: (section: EmojiSection) => ({ role: "presentation", "data-slot": SLOTS.sectionTitle, children: section.name }),
    state: controller.cells as unknown as EmojiGridState,
    variations: controller.variations,
  };
}
