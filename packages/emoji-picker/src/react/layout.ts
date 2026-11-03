// A Virtualizer layout for emoji sections. Vertical: each section is a header over a
// grid of fixed-size cells spread across the width (the CSS-grid look of
// `repeat(auto-fill, cell)` with `space-between`). Horizontal: sections side by side,
// each a column-major grid of `rows` rows under its title (the iOS keyboard), from
// strip-layout. It is also the grid's geometry for keyboard navigation and jumps.
import type { Key, Node } from "@react-types/shared";
import { Layout, LayoutInfo, Rect, Size } from "react-aria-components/Virtualizer";
import { layoutStrip, type StripLayout } from "./strip-layout";

export type GridMetrics = {
  cellWidth: number;
  cellHeight: number;
  headerHeight: number;
  /** Inline padding of the grid (and the gap before the first horizontal section). */
  padding: number;
  /** Horizontal only: space between sections, and the narrowest a section gets. */
  sectionGap: number;
  sectionMinWidth: number;
};

export type EmojiGridLayoutOptions = {
  orientation: "vertical" | "horizontal";
  metrics: GridMetrics;
  /** Vertical: most columns per row (Root `columns`). Default: as many as fit. */
  columns?: number;
  /** Vertical search results lay out in exactly `columns` columns (CSS-grid tracks); categories never exceed the fit. */
  results?: "ranked" | "grouped";
  /** Horizontal: rows per section. */
  rows?: number;
};

/** One section's cells, in order. */
export type CellGroup = { key: Key; info: LayoutInfo; header: LayoutInfo | null; keys: Key[]; start: number };

const same = (a: GridMetrics, b: GridMetrics) => (Object.keys(a) as (keyof GridMetrics)[]).every((k) => a[k] === b[k]);

export class EmojiGridLayout extends Layout<Node<unknown>, EmojiGridLayoutOptions> {
  orientation: "vertical" | "horizontal" = "vertical";
  metrics: GridMetrics = { cellWidth: 40, cellHeight: 40, headerHeight: 40, padding: 10, sectionGap: 10, sectionMinWidth: 0 };
  /** Cells per row (vertical) or per column (horizontal). */
  lanes = 1;
  groups: CellGroup[] = [];
  strip: StripLayout | null = null;
  /** Cell key → [group, index in group]. */
  positions = new Map<Key, [number, number]>();
  private infos = new Map<Key, LayoutInfo>();
  private size = new Size();

  shouldInvalidateLayoutOptions(next: EmojiGridLayoutOptions, prev: EmojiGridLayoutOptions) {
    return next.orientation !== prev.orientation || next.columns !== prev.columns || next.results !== prev.results || next.rows !== prev.rows || !same(next.metrics, prev.metrics);
  }

  update({ layoutOptions }: { layoutOptions?: EmojiGridLayoutOptions }) {
    const options = layoutOptions ?? { orientation: "vertical", metrics: this.metrics };
    this.orientation = options.orientation;
    this.metrics = options.metrics;
    this.infos = new Map();
    this.positions = new Map();
    this.groups = [];
    const collection = this.virtualizer!.collection;
    const sections = [...collection].filter((n) => n.type === "section").map((section) => {
      const children = [...collection.getChildren!(section.key)];
      return { section, header: children.find((c) => c.type === "header") ?? null, keys: children.filter((c) => c.type === "item").map((c) => c.key) };
    });
    if (options.orientation === "horizontal") this.horizontal(sections, options.rows ?? 5);
    else this.vertical(sections, options);
    // React Aria's load-more sentinel, after the last section.
    const loader = [...collection].find((n) => n.type === "loader");
    if (loader) {
      const horizontal = options.orientation === "horizontal";
      this.loader = new LayoutInfo("loader", loader.key, horizontal ? new Rect(this.size.width, 0, 1, this.size.height) : new Rect(0, this.size.height, this.size.width, 1));
      this.infos.set(loader.key, this.loader);
    } else this.loader = null;
  }
  private loader: LayoutInfo | null = null;

  private vertical(sections: { section: Node<unknown>; header: Node<unknown> | null; keys: Key[] }[], { columns, results }: EmojiGridLayoutOptions) {
    const { cellWidth, cellHeight, headerHeight, padding } = this.metrics;
    const width = this.virtualizer!.size.width;
    // The grid's width as the browser rounds it (an element's clientWidth).
    const rowWidth = Math.max(0, Math.round(width - 2 * padding));
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
      const group = this.groups.length;
      keys.forEach((key, i) => this.cell(key, section.key, x(i % lanes), top + Math.floor(i / lanes) * cellHeight, cellWidth, cellHeight, group, i));
      const end = top + Math.ceil(keys.length / lanes) * cellHeight + inset;
      info.rect.height = end - y;
      this.groups.push({ key: section.key, info, header: headerInfo, keys, start: top });
      y = end;
    }
    this.size = new Size(width, y);
  }

  private horizontal(sections: { section: Node<unknown>; header: Node<unknown> | null; keys: Key[] }[], rows: number) {
    const strip = layoutStrip(
      sections.map((s) => ({ id: String(s.section.key), count: s.keys.length })),
      { ...this.metrics, rows },
    );
    this.strip = strip;
    this.lanes = strip.rows;
    const { cellWidth, cellHeight, headerHeight } = strip;
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
      const group = this.groups.length;
      keys.forEach((key, i) => this.cell(key, section.key, box.x + Math.floor(i / strip.rows) * cellWidth, headerHeight + (i % strip.rows) * cellHeight, cellWidth, cellHeight, group, i));
      this.groups.push({ key: section.key, info, header: headerInfo, keys, start: box.x });
    }
    this.size = new Size(strip.width, strip.height);
  }

  private cell(key: Key, parentKey: Key, x: number, y: number, width: number, height: number, group: number, index: number) {
    const info = new LayoutInfo("item", key, new Rect(x, y, width, height));
    info.parentKey = parentKey;
    this.infos.set(key, info);
    this.positions.set(key, [group, index]);
  }

  getLayoutInfo(key: Key) {
    return this.infos.get(key) ?? null;
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
      for (let line = first; line <= last; line++) for (let i = line * this.lanes; i < Math.min(group.keys.length, (line + 1) * this.lanes); i++) add(this.infos.get(group.keys[i]!));
    }
    add(this.loader);
    for (const key of this.virtualizer!.persistedKeys) {
      const group = this.groups[this.positions.get(key)?.[0] ?? -1];
      if (!group) continue;
      add(group.info);
      add(group.header);
      add(this.infos.get(key));
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
