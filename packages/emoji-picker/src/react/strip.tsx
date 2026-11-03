// Internal: `<List orientation="horizontal">`. The engine lays sections out top to
// bottom only, so the horizontal list is rendered here (as the search results are):
// sections side by side, each a column-major grid of `rows` rows, inside the
// Viewport, which scrolls sideways. Only the columns near the viewport render.
import * as React from "react";
import * as Epr from "emoji-picker-react/primitives";
import { GROUPS } from "../core/dataset";
import { nameWithTone } from "../core/shortcodes";
import { CollapseContext } from "./collapse";
import { useSkinTone } from "./hooks";
import { useEmojiContext, useStoreSnapshot } from "./provider";
import { useKeyRegion, useUserKeyDown, mergeRefs, type PickerKeyboardEventHandler } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { findArtwork, useArtworkMap } from "./overrides";
import { Glyph, NAV_KEYS, cellEmoji, useResults, type Cell, type Header, type NavKey } from "./results";
import { SLOTS } from "./slots";
import { PickerDataContext, StripRegisterContext, StripSetActiveEmojiContext } from "./strip-context";
import {
  activeSection,
  categorySections,
  columnsPerPage,
  layoutStrip,
  moveInStrip,
  pageInStrip,
  placeCell,
  resultSections,
  revealCell,
  sectionOf,
  sectionScrollLeft,
  visibleRange,
  visibleSections,
  type StripItem,
  type StripLayout,
  type StripMetrics,
} from "./strip-layout";

const CELL = "calc(var(--emoji-size, 30px) + 10px)";
/** Read through a probe's computed style, so any CSS length (calc, rem, var) works. */
const PROBE: React.CSSProperties = {
  position: "absolute",
  visibility: "hidden",
  pointerEvents: "none",
  boxSizing: "content-box",
  top: 0,
  left: 0,
  width: `var(--emoji-cell-width, var(--emoji-cell-size, ${CELL}))`,
  height: `var(--emoji-cell-height, var(--emoji-cell-size, ${CELL}))`,
  paddingTop: "var(--emoji-header-height, 40px)",
  paddingLeft: "var(--emoji-list-padding, 10px)",
  paddingRight: "var(--emoji-section-gap, var(--emoji-list-padding, 10px))",
  paddingBottom: "var(--emoji-section-min-width, 0px)",
};

type Metrics = Omit<StripMetrics, "rows">;
const DEFAULT_METRICS: Metrics = { cellWidth: 40, cellHeight: 40, headerHeight: 40, padding: 10, sectionGap: 10, sectionMinWidth: 0 };

function readMetrics(probe: HTMLElement): Metrics {
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  return {
    cellWidth: px(cs.width) || DEFAULT_METRICS.cellWidth,
    cellHeight: px(cs.height) || DEFAULT_METRICS.cellHeight,
    headerHeight: px(cs.paddingTop),
    padding: px(cs.paddingLeft),
    sectionGap: px(cs.paddingRight),
    sectionMinWidth: px(cs.paddingBottom),
  };
}

const sameMetrics = (a: Metrics, b: Metrics) => (Object.keys(a) as (keyof Metrics)[]).every((k) => Math.abs(a[k] - b[k]) < 0.01);

/** Columns rendered beyond each side of the viewport. */
const OVERSCAN = 4;
const ORDER = [...GROUPS, "custom"] as string[];

/** Where a logical key moves from `index`: arrows and Home/End as the grid does, a page by the columns in view. */
function navigate(layout: StripLayout, index: number, key: NavKey, viewportWidth: number): number | null {
  if (key === "PageUp" || key === "PageDown") return pageInStrip(layout, index, key === "PageDown" ? 1 : -1, columnsPerPage(layout, viewportWidth));
  return moveInStrip(layout, index, key);
}

// In a right-to-left Viewport the strip starts at the right and scrollLeft runs
// from 0 to negative (every current engine). Positions here are logical: distance
// scrolled from the start.
const startOf = (el: HTMLElement) => Math.abs(el.scrollLeft);
const isRtl = (el: HTMLElement) => getComputedStyle(el).direction === "rtl";
const toScrollLeft = (el: HTMLElement, start: number) => (isRtl(el) ? -start : start);

export type StripProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "dangerouslySetInnerHTML" | "onKeyDown"> & {
  rows: number;
  searchRows?: number;
  cell: Cell;
  header: Header;
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
};

export const StripList = React.forwardRef<HTMLDivElement, StripProps>(function StripList({ rows, searchRows, cell: CellSlot, header: HeaderSlot, className, style, onKeyDown, ...rest }, forwardedRef) {
  const { store, groups } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  const [tone] = useSkinTone();
  const results = useResults();
  const searching = Boolean(results?.active);
  const engineCategories = Epr.useCategoryNavigation().categories;
  // A new array on every render; keep one per distinct list.
  const categoriesKey = engineCategories.map((c) => `${c.id}\u0000${c.name}`).join("\u0001");
  const categories = React.useMemo(() => engineCategories, [categoriesKey]);
  const collapse = React.useContext(CollapseContext);
  const data = React.useContext(PickerDataContext);
  const artwork = useArtworkMap();
  const register = React.useContext(StripRegisterContext);
  const setActiveEmoji = React.useContext(StripSetActiveEmojiContext);

  // --- Sections and geometry -------------------------------------------------
  const sections = React.useMemo(() => {
    if (status !== "ready") return [];
    if (searching && results) return resultSections(results.results, results.mode, ORDER, results.categoryName, (u) => store.withSkinTone(u));
    return categorySections({
      categories,
      records: store.records(),
      suggested: data.suggested,
      customGroup: (u) => groups.get(u),
      collapsed: collapse.isCollapsed,
      emojiVersion: data.emojiVersion,
      get: store.get,
      withSkinTone: (u) => store.withSkinTone(u),
    });
  }, [status, searching, results?.results, results?.mode, categories, data.suggested, data.emojiVersion, collapse, groups, store, tone]);

  const items = React.useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const [metrics, setMetrics] = React.useState<Metrics>(DEFAULT_METRICS);
  const layout = React.useMemo(
    () =>
      layoutStrip(
        sections.map((s) => ({ id: s.id, count: s.items.length })),
        { ...metrics, rows: searching ? (searchRows ?? rows) : rows },
      ),
    [sections, metrics, rows, searchRows, searching],
  );

  const listRef = React.useRef<HTMLDivElement | null>(null);
  const probeRef = React.useRef<HTMLDivElement | null>(null);
  const viewport = () => listRef.current?.closest<HTMLElement>(`[data-slot="${SLOTS.viewport}"]`) ?? listRef.current?.parentElement ?? null;

  // Sizes come from CSS variables; re-read them after every render (cheap, and a
  // variable change on an ancestor triggers no observer).
  React.useLayoutEffect(() => {
    if (!probeRef.current) return;
    const next = readMetrics(probeRef.current);
    if (!sameMetrics(next, metrics)) setMetrics(next);
  });

  // --- Scroll: virtual window and current section ------------------------------
  const latest = React.useRef({ layout, sections });
  latest.current = { layout, sections };
  /** Last scroll position, read at render (renders happen per window step, not per scroll event). */
  const scroll = React.useRef({ left: 0, width: 0 });
  const [scrollWindow, setWindow] = React.useState({ from: 0, to: 0 });
  const [active, setActive] = React.useState<string | null>(null);
  /** Target of a tab jump: the current section stays put until the scroll gets there. */
  const jumping = React.useRef<number | null>(null);

  const sync = React.useCallback((el: HTMLElement) => {
    const { layout, sections } = latest.current;
    const left = startOf(el);
    const width = el.clientWidth;
    // The rendered window moves in steps of OVERSCAN columns, so most scroll events re-render nothing.
    const step = Math.max(1, layout.cellWidth * OVERSCAN);
    const from = Math.floor(left / step) * step - step;
    const to = from + width + 3 * step;
    setWindow((w) => (w.from === from && w.to === to ? w : { from, to }));
    scroll.current = { left, width };
    if (jumping.current != null) {
      if (Math.abs(left - jumping.current) > 1) return;
      jumping.current = null;
    }
    const index = activeSection(layout, left, width);
    setActive(index >= 0 ? sections[index]!.id : null);
  }, []);

  React.useLayoutEffect(() => {
    const el = viewport();
    if (!el) return;
    sync(el);
    const onScroll = () => sync(el);
    const release = () => {
      jumping.current = null;
      sync(el);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", release);
    el.addEventListener("wheel", release, { passive: true });
    el.addEventListener("pointerdown", release, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => sync(el));
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", release);
      el.removeEventListener("wheel", release);
      el.removeEventListener("pointerdown", release);
      ro?.disconnect();
    };
  }, [sync]);
  // Layout changes (data loaded, sizes, sections) can move the current section.
  React.useLayoutEffect(() => {
    const el = viewport();
    if (el) sync(el);
  }, [layout, sync]);

  // A new query starts at the beginning, as does leaving search.
  React.useLayoutEffect(() => {
    const el = viewport();
    if (el && startOf(el)) el.scrollLeft = 0;
  }, [searching, results?.results]);

  // --- Focus (roving tabindex) and hover --------------------------------------
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [hovered, setHovered] = React.useState(-1);
  /** focusModel "input": the cell highlighted from the search field (null: none, the user is typing). */
  const [inputIndex, setInputIndex] = React.useState<number | null>(null);
  const stripId = React.useId();
  const cellId = (index: number) => `${stripId}-${index}`;
  const pendingFocus = React.useRef<number | null>(null);
  const [focusWithin, setFocusWithin] = React.useState(false);
  // The tab stop: the last focused cell, or, once it has scrolled out of view while
  // focus is elsewhere, the first cell in view (so Tab enters where the user looks).
  let current = Math.min(focusIndex, Math.max(0, layout.total - 1));
  if (!focusWithin && layout.total) {
    const { left, width } = scroll.current;
    const place = placeCell(layout, current);
    if (place && width && (place.x + layout.cellWidth <= left || place.x >= left + width)) current = visibleRange(layout, left + layout.padding, left + width)[0]?.first ?? current;
  }

  const reveal = React.useCallback(
    (index: number) => {
      const el = viewport();
      if (!el) return;
      const start = startOf(el);
      const left = revealCell(latest.current.layout, index, start, el.clientWidth);
      if (left !== start) {
        el.scrollLeft = toScrollLeft(el, left);
        sync(el);
      }
    },
    [sync],
  );

  const focusCell = React.useCallback(
    (index: number) => {
      setFocusIndex(index);
      reveal(index);
      pendingFocus.current = index;
      // Already rendered: focus now; otherwise after the render that adds it.
      const cell = listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
      if (cell) {
        pendingFocus.current = null;
        cell.focus({ preventScroll: true });
      }
    },
    [reveal],
  );
  React.useLayoutEffect(() => {
    if (pendingFocus.current == null) return;
    const cell = listRef.current?.querySelector<HTMLElement>(`[data-index="${pendingFocus.current}"]`);
    if (cell) {
      pendingFocus.current = null;
      cell.focus({ preventScroll: true });
    }
  });

  // --- Navigation shared with CategoryNav, Search and useActiveEmoji ---------------
  const jump = React.useCallback(
    (id: string, { instant = false }: { instant?: boolean } = {}) => {
      const el = viewport();
      const { layout } = latest.current;
      const index = layout.sections.findIndex((s) => s.id === id);
      if (!el || index < 0) return;
      const left = sectionScrollLeft(layout, index, el.clientWidth);
      setActive(id);
      setFocusIndex(layout.sections[index]!.start);
      if (Math.abs(left - startOf(el)) <= 1) return;
      jumping.current = left;
      // A tab picked with the keyboard jumps; a click scrolls (unless motion is reduced).
      const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: toScrollLeft(el, left), behavior: instant || reduce ? "auto" : "smooth" });
    },
    [],
  );
  const focusGrid = React.useCallback(() => {
    const { layout } = latest.current;
    if (!layout.total) return false;
    const el = viewport();
    // The current cell if it's in view, else the first one in view.
    let index = Math.min(focusIndex, layout.total - 1);
    const place = placeCell(layout, index);
    const start = el ? startOf(el) : 0;
    if (el && place && (place.x + layout.cellWidth <= start || place.x >= start + el.clientWidth)) {
      const range = visibleRange(layout, start + layout.padding, start + el.clientWidth);
      index = range[0]?.first ?? 0;
    }
    focusCell(index);
    return true;
  }, [focusIndex, focusCell]);

  // focusModel "input": keys from the search field move a highlight; focus stays there.
  const keyFromInput = React.useCallback(
    (action: KeyboardAction, input: HTMLInputElement) => {
      const { layout } = latest.current;
      if (!layout.total) return false;
      if (action === "select") {
        if (inputIndex == null) return false;
        const item = items[inputIndex];
        if (item) data.pick(item.record);
        return true;
      }
      let key = NAV_KEYS[action];
      if (!key) return false;
      if ((key === "ArrowLeft" || key === "ArrowRight") && isRtl(input)) key = key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
      const el = viewport();
      if (inputIndex == null) {
        // Down (or Right/End-ward keys) starts at the first emoji in view.
        if (key === "ArrowUp" || key === "ArrowLeft" || key === "PageUp") return false;
        const start = el ? startOf(el) : 0;
        const first = key === "End" ? layout.total - 1 : key === "Home" ? 0 : (visibleRange(layout, start + layout.padding, start + (el?.clientWidth ?? 0))[0]?.first ?? 0);
        setInputIndex(first);
        reveal(first);
        return true;
      }
      const next = navigate(layout, inputIndex, key, el?.clientWidth ?? 0);
      if (next != null) {
        setInputIndex(next);
        reveal(next);
      } else if (key === "ArrowUp") setInputIndex(null); // back to typing
      return true;
    },
    [inputIndex, items, data, reveal],
  );
  const clearInputHighlight = React.useCallback(() => setInputIndex(null), []);
  // Leaving search mode or changing what's listed drops the highlight.
  React.useEffect(() => setInputIndex(null), [searching, sections]);
  React.useEffect(() => {
    const record = inputIndex != null ? items[inputIndex]?.record : undefined;
    if (record) setActiveEmoji(record);
  }, [inputIndex, items, setActiveEmoji]);

  React.useEffect(
    () =>
      register({
        active: searching ? null : active,
        jump,
        focus: focusGrid,
        key: keyFromInput,
        clear: clearInputHighlight,
        activeDescendant: !searching && inputIndex != null ? cellId(inputIndex) : undefined,
      }),
    [register, active, jump, focusGrid, searching, keyFromInput, clearInputHighlight, inputIndex],
  );
  React.useEffect(() => () => register(null), [register]);

  // Arrow keys from the search field move the results highlight through the strip.
  React.useEffect(() => {
    if (!results) return;
    const toGlobal = (result: number) => items.findIndex((it) => it.result === result);
    results.move.current = (from, key) => {
      const next = navigate(latest.current.layout, Math.max(0, toGlobal(from)), key, viewport()?.clientWidth ?? 0);
      return next == null ? null : (items[next]?.result ?? null);
    };
    return () => {
      results.move.current = null;
    };
  }, [results, items]);
  // Keep the highlighted result in view.
  const highlightedGlobal = searching && results && results.highlighted >= 0 ? items.findIndex((it) => it.result === results.highlighted) : -1;
  React.useEffect(() => {
    if (highlightedGlobal >= 0) reveal(highlightedGlobal);
  }, [highlightedGlobal, reveal]);

  const activeEmoji = (index: number) => {
    setHovered(index);
    setActiveEmoji(index >= 0 ? (items[index]?.record ?? null) : null);
  };
  React.useEffect(() => () => setActiveEmoji(null), [setActiveEmoji]);

  const leave = (key: string) => {
    // The engine's root element (its data-slot can be replaced by a consumer's attribute).
    const root = listRef.current?.closest(`[data-slot="${SLOTS.root}"], [data-epr-part="root"]`);
    const list = listRef.current?.getBoundingClientRect();
    if (!root || !list) return false;
    const target =
      key === "ArrowUp"
        ? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`)
        : (root.querySelector<HTMLElement>(`[data-slot="${SLOTS.categoryTab}"][data-active]`) ?? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.categoryTab}"]`));
    if (!target) return false;
    const r = target.getBoundingClientRect();
    // Only to a part that is actually on that side.
    if (key === "ArrowUp" ? r.bottom > list.top + 1 : r.top < list.bottom - 1) return false;
    target.focus();
    return true;
  };

  // Keys on a focused cell, from Root's dispatcher (the keymap's actions).
  const region = useKeyRegion((action, event) => {
    const cellEl = (event.target as Element).closest<HTMLElement>("[data-index]");
    if (!action || !cellEl || !listRef.current?.contains(cellEl)) return "pass";
    if (action === "select") {
      cellEl.click();
      return "handled";
    }
    let key = NAV_KEYS[action];
    if (!key) return "pass";
    if (listRef.current && isRtl(listRef.current) && (key === "ArrowLeft" || key === "ArrowRight")) key = key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    const next = navigate(layout, Number(cellEl.dataset.index), key, viewport()?.clientWidth ?? 0);
    if (next != null) focusCell(next);
    else if (key === "ArrowUp" || key === "ArrowDown") leave(key);
    return "handled";
  });
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const ref = React.useMemo(() => mergeRefs(listRef, forwardedRef, region, userKeys), [forwardedRef, region, userKeys]);

  const pick = (item: StripItem) => {
    if (item.result != null && results) results.pick(item.result);
    else data.pick(item.record);
  };

  // --- Render ---------------------------------------------------------------
  const ranges = visibleRange(layout, scrollWindow.from, scrollWindow.to);
  const headers = visibleSections(layout, scrollWindow.from, scrollWindow.to);
  let columnsBefore = 0;
  const columnOffset = layout.sections.map((s) => {
    const c = columnsBefore;
    columnsBefore += s.columns;
    return c;
  });
  const rowsOfCells: React.ReactNode[][] = Array.from({ length: layout.rows }, () => []);
  // The tab stop always renders, even outside the window.
  if (layout.total && !ranges.some((r) => current >= r.first && current <= r.last)) ranges.push({ section: sectionOf(layout, current), first: current, last: current });
  for (const range of ranges) {
    for (let index = range.first; index <= range.last; index++) {
      const item = items[index]!;
      const place = placeCell(layout, index)!;
      const highlighted = searching ? item.result === results?.highlighted : index === inputIndex;
      const isActive = index === hovered;
      rowsOfCells[place.row]!.push(
        <CellSlot
          key={`${layout.sections[place.section]!.id}:${item.record.unified}:${index}`}
          id={cellId(index)}
          type="button"
          role="gridcell"
          tabIndex={index === current ? 0 : -1}
          aria-label={nameWithTone(item.record.name, item.unified)}
          aria-selected={highlighted || undefined}
          aria-colindex={columnOffset[place.section]! + place.column + 1}
          data-index={index}
          data-overridden={artwork && findArtwork(artwork, item.unified) !== undefined ? "" : undefined}
          data-epr-unified={item.unified}
          // Our own attribute, not the engine's data-epr-highlighted: the engine treats that mark as its highlight and clears it.
          data-highlighted={highlighted ? "" : undefined}
          emoji={cellEmoji(item.record, item.unified, isActive)}
          onClick={() => pick(item)}
          onPointerEnter={(e: React.PointerEvent<HTMLElement>) => {
            if (!isActive) activeEmoji(index);
            if (data.pointer !== "follows") return;
            // Hover moves the keyboard position: the results highlight, the highlight
            // driven from the field, or (once focus is in the strip) focus itself.
            if (searching && item.result != null && results && results.highlighted !== item.result) results.setHighlighted(item.result);
            const focused = document.activeElement;
            if (!searching && data.focusModel === "input" && focused instanceof HTMLInputElement && listRef.current?.closest('[data-epr-part="root"]')?.contains(focused)) setInputIndex(index);
            if (data.focusModel === "grid" && focused !== e.currentTarget && focused instanceof HTMLElement && listRef.current?.contains(focused)) e.currentTarget.focus({ preventScroll: true });
          }}
          onFocus={() => {
            if (index !== focusIndex) setFocusIndex(index);
            if (!isActive) activeEmoji(index);
          }}
          style={{ position: "absolute", insetInlineStart: place.x, top: 0, width: layout.cellWidth, height: layout.cellHeight, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Glyph record={item.record} unified={item.unified} active={isActive || highlighted} />
        </CellSlot>,
      );
    }
  }

  return (
    <div
      {...rest}
      ref={ref}
      role="grid"
      aria-label={rest["aria-label"] ?? (searching ? "Search results" : "Emoji")}
      aria-rowcount={layout.rows}
      aria-colcount={columnsBefore}
      aria-busy={(searching && results?.pending) || undefined}
      data-slot={SLOTS.list}
      data-orientation="horizontal"
      data-results={searching ? results?.mode : undefined}
      className={className}
      onPointerLeave={() => activeEmoji(-1)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setFocusWithin(false);
        activeEmoji(-1);
      }}
      style={{ position: "relative", flex: "none", width: layout.width, height: layout.height, ...style }}
    >
      <div ref={probeRef} aria-hidden style={PROBE} />
      {headers.map((i) => {
        const s = layout.sections[i]!;
        const name = sections[i]!.name;
        if (!name) return null;
        return (
          <div key={s.id} role="presentation" data-slot={SLOTS.category} style={{ position: "absolute", insetInlineStart: s.x, top: 0, width: s.width, height: layout.headerHeight }}>
            <HeaderSlot
              category={{ id: s.id, name } as Epr.CategoryHeaderRenderProps["category"]}
              aria-hidden
              style={{ position: "sticky", insetInlineStart: 0, width: "max-content", maxWidth: "100%", height: layout.headerHeight }}
            >
              {name}
            </HeaderSlot>
          </div>
        );
      })}
      {rowsOfCells.map((cells, row) => (
        <div key={row} role="row" aria-rowindex={row + 1} style={{ position: "absolute", insetInlineStart: 0, top: layout.headerHeight + row * layout.cellHeight, width: layout.width, height: layout.cellHeight }}>
          {cells}
        </div>
      ))}
    </div>
  );
});
