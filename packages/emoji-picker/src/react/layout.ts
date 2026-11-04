// A Virtualizer layout for emoji sections. Vertical: each section is a header over a
// grid of fixed-size cells spread across the width (the CSS-grid look of
// `repeat(auto-fill, cell)` with `space-between`). Horizontal: sections side by side,
// each a column-major grid of `rows` rows under its title (the iOS keyboard), from
// strip-layout. It is also the grid's geometry for keyboard navigation and jumps.
import type { Key, Node } from "@react-types/shared";
import { Layout, LayoutInfo, Rect, Size } from "react-stately/useVirtualizerState";
import { layoutStrip, type StripLayout } from "./strip-layout";

export type GridMetrics = {
  cellWidth: number;
  cellHeight: number;
  headerHeight: number;
  /** Inline padding of the grid (and the gap before the first horizontal section). */
  padding: number;
  /** Vertical, without `columns`: the grid's inline-end padding (`--emoji-list-padding-end`; may be negative). */
  paddingEnd: number;
  /** Horizontal only: space between sections, and the narrowest a section gets. */
  sectionGap: number;
  sectionMinWidth: number;
};

export type EmojiGridLayoutOptions = {
  orientation: "vertical" | "horizontal";
  metrics: GridMetrics;
  /** Vertical: most columns per row (Root `columns`). Default: as many as fit. */
  columns?: number;
  /** Vertical: false keeps `columns` even when the width is short of them (the grid runs past its end padding). */
  fitColumns?: boolean;
  /** Vertical search results lay out in exactly `columns` columns (CSS-grid tracks); categories never exceed the fit. */
  results?: "ranked" | "grouped";
  /** Horizontal: rows per section. */
  rows?: number;
};

/** One section's cells, in order; `place` gives a cell's offset by its index. */
export type CellGroup = { key: Key; info: LayoutInfo; header: LayoutInfo | null; keys: readonly Key[]; start: number; place: (index: number) => readonly [number, number] };

const same = (a: GridMetrics, b: GridMetrics) => (Object.keys(a) as (keyof GridMetrics)[]).every((k) => a[k] === b[k]);
// A cell's group and index, packed in one number.
const SPAN = 1 << 20;

type Section = { section: Node<unknown>; header: Node<unknown> | null; keys: Key[] };

export class EmojiGridLayout extends Layout<Node<unknown>, EmojiGridLayoutOptions> {
  orientation: "vertical" | "horizontal" = "vertical";
  metrics: GridMetrics = { cellWidth: 40, cellHeight: 40, headerHeight: 40, padding: 10, paddingEnd: 10, sectionGap: 10, sectionMinWidth: 0 };
  /** Cells per row (vertical) or per column (horizontal). */
  lanes = 1;
  groups: CellGroup[] = [];
  strip: StripLayout | null = null;
  private cells = new Map<Key, number>();
  /** Sections, titles and the loader; cells' infos are made as they're asked for. */
  private infos = new Map<Key, LayoutInfo>();
  private cellInfos = new Map<Key, LayoutInfo>();
  private size = new Size();
  private loader: LayoutInfo | null = null;

  shouldInvalidateLayoutOptions(next: EmojiGridLayoutOptions, prev: EmojiGridLayoutOptions) {
    return next.orientation !== prev.orientation || next.columns !== prev.columns || next.fitColumns !== prev.fitColumns || next.results !== prev.results || next.rows !== prev.rows || !same(next.metrics, prev.metrics);
  }

  /** A cell's section (index into `groups`) and its index in it. */
  position(key: Key): readonly [number, number] | null {
    const p = this.cells.get(key);
    return p == null ? null : [Math.floor(p / SPAN), p % SPAN];
  }

  update({ layoutOptions }: { layoutOptions?: EmojiGridLayoutOptions }) {
    const options = layoutOptions ?? { orientation: "vertical", metrics: this.metrics };
    this.orientation = options.orientation;
    this.metrics = options.metrics;
    this.infos = new Map();
    this.cellInfos = new Map();
    this.cells = new Map();
    this.groups = [];
    const collection = this.virtualizer!.collection;
    const sections: Section[] = [];
    let loader: Node<unknown> | null = null;
    for (const n of collection) {
      if (n.type === "loader") loader = n;
      if (n.type !== "section") continue;
      let header: Node<unknown> | null = null;
      const keys: Key[] = [];
      for (const c of collection.getChildren!(n.key)) {
        if (c.type === "header") header = c;
        else if (c.type === "item") keys.push(c.key);
      }
      sections.push({ section: n, header, keys });
    }
    if (options.orientation === "horizontal") this.horizontal(sections, options.rows ?? 5);
    else this.vertical(sections, options);
    // React Aria's load-more sentinel, after the last section.
    if (loader) {
      const horizontal = options.orientation === "horizontal";
      this.loader = new LayoutInfo("loader", loader.key, horizontal ? new Rect(this.size.width, 0, 1, this.size.height) : new Rect(0, this.size.height, this.size.width, 1));
      this.infos.set(loader.key, this.loader);
    } else this.loader = null;
  }

  private vertical(sections: Section[], { columns, results, fitColumns = true }: EmojiGridLayoutOptions) {
    const { cellWidth, cellHeight, headerHeight, padding, paddingEnd } = this.metrics;
    const width = this.virtualizer!.size.width;
    // The grid's width as the browser rounds it (an element's clientWidth). With `columns` it spans
    // the padded width (or all the columns, when they needn't fit); else it ends at its end padding.
    const rowWidth = Math.max(0, Math.round(columns ? Math.max(fitColumns ? 0 : columns * cellWidth, width - 2 * padding) : width - padding - paddingEnd));
    const fit = Math.max(1, Math.floor(rowWidth / cellWidth));
    const lanes = results && columns ? columns : columns ? Math.min(columns, fit) : fit;
    const gap = lanes > 1 ? Math.max(0, rowWidth - lanes * cellWidth) / (lanes - 1) : 0;
    // Category cells snap to whole pixels; results are CSS-grid tracks and don't.
    const x = (lane: number) => padding + (results ? lane * (cellWidth + gap) : Math.round(lane * (cellWidth + gap)));
    this.lanes = lanes;
    const inset = results === "ranked" ? padding : 0;
    let y = 0;
    for (const { section, header, keys } of sections) {
      const info = new LayoutInfo("section", section.key, new Rect(0, y, width, 0));
      info.allowOverflow = true;
      this.infos.set(section.key, info);
      let headerInfo: LayoutInfo | null = null;
      if (header) {
        headerInfo = new LayoutInfo("header", header.key, new Rect(0, y, width, headerHeight));
        headerInfo.parentKey = section.key;
        headerInfo.isSticky = true;
        headerInfo.zIndex = results ? 1 : 2;
        this.infos.set(header.key, headerInfo);
      }
      const top = y + (header ? headerHeight : 0) + inset;
      const end = top + Math.ceil(keys.length / lanes) * cellHeight + inset;
      info.rect.height = end - y;
      this.addGroup({ key: section.key, info, header: headerInfo, keys, start: top, place: (i) => [x(i % lanes), top + Math.floor(i / lanes) * cellHeight] });
      y = end;
    }
    // Ranked results are one padded row, even with nothing in it.
    if (!sections.length && results === "ranked") y = 2 * padding;
    this.size = new Size(width, y);
  }

  private horizontal(sections: Section[], rows: number) {
    const strip = layoutStrip(
      sections.map((s) => ({ id: String(s.section.key), count: s.keys.length })),
      { ...this.metrics, rows },
    );
    this.strip = strip;
    this.lanes = strip.rows;
    const { cellWidth, headerHeight } = strip;
    let s = 0;
    for (const { section, header, keys } of sections) {
      if (!keys.length) continue;
      const box = strip.sections[s++]!;
      const info = new LayoutInfo("section", section.key, new Rect(box.x, 0, box.width, strip.height));
      info.allowOverflow = true;
      this.infos.set(section.key, info);
      let headerInfo: LayoutInfo | null = null;
      if (header) {
        headerInfo = new LayoutInfo("header", header.key, new Rect(box.x, 0, box.width, headerHeight));
        headerInfo.parentKey = section.key;
        headerInfo.isSticky = true;
        this.infos.set(header.key, headerInfo);
      }
      this.addGroup({ key: section.key, info, header: headerInfo, keys, start: box.x, place: (i) => [box.x + Math.floor(i / strip.rows) * cellWidth, headerHeight + (i % strip.rows) * strip.cellHeight] });
    }
    this.size = new Size(strip.width, strip.height);
  }

  private addGroup(group: CellGroup) {
    const g = this.groups.length * SPAN;
    group.keys.forEach((key, i) => this.cells.set(key, g + i));
    this.groups.push(group);
  }

  getLayoutInfo(key: Key) {
    const known = this.infos.get(key) ?? this.cellInfos.get(key);
    if (known) return known;
    const p = this.position(key);
    if (!p) return null;
    const group = this.groups[p[0]]!;
    const [x, y] = group.place(p[1]);
    const { cellWidth, cellHeight } = this.metrics;
    const info = new LayoutInfo("item", key, new Rect(x, y, cellWidth, cellHeight));
    info.parentKey = group.key;
    this.cellInfos.set(key, info);
    return info;
  }

  getContentSize() {
    return this.size;
  }

  /** Sections and headers that intersect, the cells in the visible lines, and persisted (focused) cells. */
  getVisibleLayoutInfos(rect: Rect) {
    const out: LayoutInfo[] = [];
    const seen = new Set<Key>();
    const add = (info: LayoutInfo | null | undefined) => {
      if (info && !seen.has(info.key)) {
        seen.add(info.key);
        out.push(info);
      }
    };
    const horizontal = this.orientation === "horizontal";
    const size = horizontal ? this.metrics.cellWidth : this.metrics.cellHeight;
    for (const group of this.groups) {
      if (!group.info.rect.intersects(rect)) continue;
      add(group.info);
      add(group.header);
      const from = horizontal ? rect.x : rect.y;
      const to = horizontal ? rect.maxX : rect.maxY;
      const lines = Math.ceil(group.keys.length / this.lanes);
      const first = Math.max(0, Math.floor((from - group.start) / size));
      const last = Math.min(lines - 1, Math.floor((to - group.start) / size));
      for (let line = first; line <= last; line++) for (let i = line * this.lanes; i < Math.min(group.keys.length, (line + 1) * this.lanes); i++) add(this.getLayoutInfo(group.keys[i]!));
    }
    add(this.loader);
    for (const key of this.virtualizer!.persistedKeys) {
      const group = this.groups[this.position(key)?.[0] ?? -1];
      if (!group) continue;
      add(group.info);
      add(group.header);
      add(this.getLayoutInfo(key));
    }
    return out;
  }

  /** The section under the start edge of the visible rect (the one whose header is stuck). */
  sectionAt(offset: number): Key | null {
    const horizontal = this.orientation === "horizontal";
    let current: Key | null = null;
    for (const g of this.groups) {
      const start = horizontal ? g.info.rect.x : g.info.rect.y;
      const end = horizontal ? g.info.rect.maxX : g.info.rect.maxY;
      if (end > offset + 1 && (current == null || start <= offset + 1)) current = g.key;
      if (start > offset + 1) break;
    }
    return current;
  }
}
