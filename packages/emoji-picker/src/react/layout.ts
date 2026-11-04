// A Virtualizer layout for emoji sections. Vertical: the rows of core/grid, cells spread across
// the width (the CSS-grid look of `repeat(auto-fill, cell)` with `space-between`). Horizontal:
// sections side by side, each a column-major grid of `rows` rows under its title (the iOS
// keyboard), from strip-layout. It is also the geometry for keyboard navigation and jumps.
import type { Key, Node } from "@react-types/shared";
import { Layout, LayoutInfo, Rect, Size } from "react-stately/useVirtualizerState";
import { createEmojiGrid, type EmojiGrid } from "../core/grid";
import type { EmojiSection } from "../core/sections";
import { layoutStrip, placeCell, type StripLayout } from "./strip-layout";

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

/** A section's box and title, and its rows in `grid` (vertical). */
type SectionBox = { key: Key; info: LayoutInfo; header: LayoutInfo | null; rows: number[] };

const same = (a: GridMetrics, b: GridMetrics) => (Object.keys(a) as (keyof GridMetrics)[]).every((k) => a[k] === b[k]);

export class EmojiGridLayout extends Layout<Node<unknown>, EmojiGridLayoutOptions> {
  orientation: "vertical" | "horizontal" = "vertical";
  metrics: GridMetrics = { cellWidth: 40, cellHeight: 40, headerHeight: 40, padding: 10, paddingEnd: 10, sectionGap: 10, sectionMinWidth: 0 };
  /** Cells per row (vertical) or per column (horizontal). */
  lanes = 1;
  grid: EmojiGrid<EmojiSection> = createEmojiGrid([], { columns: 1, rowHeight: 0 });
  strip: StripLayout | null = null;
  sections: SectionBox[] = [];
  private x: (column: number) => number = () => 0;
  /** Sections, titles and the loader; cells' infos are made as they're asked for. */
  private infos = new Map<Key, LayoutInfo>();
  private cellInfos = new Map<Key, LayoutInfo>();
  private size = new Size();
  private loader: LayoutInfo | null = null;

  shouldInvalidateLayoutOptions(next: EmojiGridLayoutOptions, prev: EmojiGridLayoutOptions) {
    return next.orientation !== prev.orientation || next.columns !== prev.columns || next.fitColumns !== prev.fitColumns || next.results !== prev.results || next.rows !== prev.rows || !same(next.metrics, prev.metrics);
  }

  update({ layoutOptions }: { layoutOptions?: EmojiGridLayoutOptions }) {
    const options = layoutOptions ?? { orientation: "vertical", metrics: this.metrics };
    this.orientation = options.orientation;
    this.metrics = options.metrics;
    this.infos = new Map();
    this.cellInfos = new Map();
    this.sections = [];
    this.strip = null;
    const collection = this.virtualizer!.collection;
    const sections: EmojiSection[] = [];
    let loader: Node<unknown> | null = null;
    for (const n of collection) {
      if (n.type === "loader") loader = n;
      if (n.type === "section") sections.push(n.value as EmojiSection);
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

  private section(s: EmojiSection, rect: Rect, results?: string) {
    const info = new LayoutInfo("section", s.id, rect);
    info.allowOverflow = true;
    this.infos.set(s.id, info);
    let header: LayoutInfo | null = null;
    if (s.header) {
      header = new LayoutInfo("header", `header:${s.id}`, new Rect(rect.x, rect.y, rect.width, this.orientation === "horizontal" ? this.strip!.headerHeight : this.metrics.headerHeight));
      header.parentKey = s.id;
      header.isSticky = true;
      if (this.orientation === "vertical") header.zIndex = results ? 1 : 2;
      this.infos.set(header.key, header);
    }
    const box = { key: s.id, info, header, rows: [] };
    this.sections.push(box);
    return box;
  }

  private vertical(sections: EmojiSection[], { columns, results, fitColumns = true }: EmojiGridLayoutOptions) {
    const { cellWidth, cellHeight, headerHeight, padding, paddingEnd } = this.metrics;
    const width = this.virtualizer!.size.width;
    // The grid's width as the browser rounds it (an element's clientWidth). With `columns` it spans
    // the padded width (or all the columns, when they needn't fit); else it ends at its end padding.
    const rowWidth = Math.max(0, Math.round(columns ? Math.max(fitColumns ? 0 : columns * cellWidth, width - 2 * padding) : width - padding - paddingEnd));
    const fit = Math.max(1, Math.floor(rowWidth / cellWidth));
    const lanes = results && columns ? columns : columns ? Math.min(columns, fit) : fit;
    const gap = lanes > 1 ? Math.max(0, rowWidth - lanes * cellWidth) / (lanes - 1) : 0;
    // Category cells snap to whole pixels; results are CSS-grid tracks and don't.
    this.x = (lane) => padding + (results ? lane * (cellWidth + gap) : Math.round(lane * (cellWidth + gap)));
    this.lanes = lanes;
    // Ranked results are one padded row, even with nothing in it.
    this.grid = createEmojiGrid(sections, { columns: lanes, rowHeight: cellHeight, headerHeight, padding: results === "ranked" ? padding : 0 });
    let box: SectionBox | null = null;
    for (const [r, row] of this.grid.rows.entries()) {
      if (box?.key !== row.section.id) box = this.section(row.section, new Rect(0, box ? row.offset : 0, width, 0), results);
      box.info.rect.height = row.offset + row.size - box.info.rect.y;
      if (row.type === "emojis") box.rows.push(r);
    }
    if (box) box.info.rect.height = this.grid.size - box.info.rect.y;
    this.size = new Size(width, this.grid.size);
  }

  private horizontal(sections: EmojiSection[], rows: number) {
    const strip = layoutStrip(
      sections.map((s) => ({ id: s.id, count: s.items.length })),
      { ...this.metrics, rows },
    );
    this.strip = strip;
    this.lanes = strip.rows;
    this.grid = createEmojiGrid(sections, { columns: strip.rows, rowHeight: 0 });
    for (const box of strip.sections) this.section(sections.find((s) => s.id === box.id)!, new Rect(box.x, 0, box.width, strip.height));
    this.size = new Size(strip.width, strip.height);
  }

  getLayoutInfo(key: Key) {
    const known = this.infos.get(key) ?? this.cellInfos.get(key);
    if (known) return known;
    const index = this.grid.indexOf(String(key));
    const at = this.grid.locate(index);
    if (!at) return null;
    const cell = this.strip ? placeCell(this.strip, index)! : { x: this.x(at.column), y: this.grid.rows[at.row]!.offset };
    const info = new LayoutInfo("item", key, new Rect(cell.x, cell.y, this.metrics.cellWidth, this.metrics.cellHeight));
    info.parentKey = at.section.id;
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
    const strip = this.strip;
    for (const box of this.sections) {
      if (!box.info.rect.intersects(rect)) continue;
      add(box.info);
      add(box.header);
      if (strip) {
        const s = strip.sections.find((s) => s.id === box.key)!;
        const first = Math.max(0, Math.floor((rect.x - s.x) / strip.cellWidth));
        const last = Math.min(s.columns - 1, Math.floor((rect.maxX - s.x) / strip.cellWidth));
        for (let i = first * strip.rows; i < Math.min(s.count, (last + 1) * strip.rows); i++) add(this.getLayoutInfo(this.grid.at(s.start + i)!.id));
      } else
        for (const r of box.rows) {
          const row = this.grid.rows[r]!;
          if (row.type === "emojis" && row.offset + row.size > rect.y && row.offset <= rect.maxY) for (const item of row.items) add(this.getLayoutInfo(item.id));
        }
    }
    add(this.loader);
    for (const key of this.virtualizer!.persistedKeys) {
      const cell = this.getLayoutInfo(key);
      const box = cell?.parentKey == null ? undefined : this.sections.find((b) => b.key === cell.parentKey);
      if (!box) continue;
      add(box.info);
      add(box.header);
      add(cell);
    }
    return out;
  }

  /** The section under the start edge of the visible rect (the one whose header is stuck). */
  sectionAt(offset: number): Key | null {
    const horizontal = this.orientation === "horizontal";
    let current: Key | null = null;
    for (const { key, info } of this.sections) {
      const start = horizontal ? info.rect.x : info.rect.y;
      const end = horizontal ? info.rect.maxX : info.rect.maxY;
      if (end > offset + 1 && (current == null || start <= offset + 1)) current = key;
      if (start > offset + 1) break;
    }
    return current;
  }
}
