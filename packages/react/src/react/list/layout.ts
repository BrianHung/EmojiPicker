import type { Key } from "@react-types/shared";
import { Layout, LayoutInfo, Rect, Size } from "react-stately/useVirtualizerState";
import { shallowEqual, type EmojiSection, type SearchResultsMode } from "@brianhung/emoji-picker-core";
import { createEmojiGrid, layoutStrip, placeCell, type EmojiGrid, type StripLayout } from "@brianhung/emoji-picker-core/grid";
import type { CollectionNode, CollectionValue } from "./collection";

export interface GridMetrics {
  cellWidth: number;
  cellHeight: number;
  headerHeight: number;
  padding: number;
  paddingEnd: number;
  sectionGap: number;
  sectionMinWidth: number;
}

// The CSS defaults Root sets (--ep-cell, --ep-header, --ep-pad), until the probe measures the real ones
export const DEFAULT_METRICS: GridMetrics = { cellWidth: 40, cellHeight: 40, headerHeight: 40, padding: 10, paddingEnd: 10, sectionGap: 10, sectionMinWidth: 0 };

export interface EmojiGridLayoutOptions {
  metrics: GridMetrics;
  columns?: number;
  results?: SearchResultsMode;
  rows?: number;
}

type SectionBox = { key: Key; info: LayoutInfo; header: LayoutInfo | null; rows: number[] };
type Add = (info: LayoutInfo | null | undefined) => void;

const isSection = (value: CollectionValue): value is EmojiSection => "items" in value;

const X = { horizontal: true, scroll: "scrollLeft", client: "clientWidth", by: "left", start: "x", end: "maxX", size: "width" } as const;
const Y = { horizontal: false, scroll: "scrollTop", client: "clientHeight", by: "top", start: "y", end: "maxY", size: "height" } as const;

export abstract class EmojiGridLayout extends Layout<CollectionNode, EmojiGridLayoutOptions> {
  abstract readonly axis: typeof X | typeof Y;
  metrics: GridMetrics = DEFAULT_METRICS;
  grid: EmojiGrid<EmojiSection> = createEmojiGrid([], { columns: 1, rowHeight: 0 });
  strip: StripLayout | null = null;
  sections: SectionBox[] = [];
  protected size = new Size();
  private infos = new Map<Key, LayoutInfo>();
  private cellInfos = new Map<Key, LayoutInfo>();

  protected abstract build(sections: EmojiSection[], options: EmojiGridLayoutOptions): void;
  protected abstract place(index: number, row: number, column: number): { x: number; y: number };
  protected abstract addCells(box: SectionBox, rect: Rect, add: Add): void;
  abstract firstVisible(rect: Rect): Key | null;
  abstract revealBy(key: Key, cell: Rect, rect: Rect): number | null;
  abstract jumpTarget(section: Rect, viewport: number): number;
  abstract activeSection(rect: Rect): Key | null;

  shouldInvalidateLayoutOptions(next: EmojiGridLayoutOptions, prev: EmojiGridLayoutOptions) {
    return next.columns !== prev.columns || next.results !== prev.results || next.rows !== prev.rows || !shallowEqual(next.metrics, prev.metrics);
  }

  update({ layoutOptions }: { layoutOptions?: EmojiGridLayoutOptions }) {
    const options = layoutOptions ?? { metrics: this.metrics };
    this.metrics = options.metrics;
    this.infos = new Map();
    this.cellInfos = new Map();
    this.sections = [];
    const sections: EmojiSection[] = [];
    for (const n of this.virtualizer!.collection) if (n.value && isSection(n.value)) sections.push(n.value);
    this.build(sections, options);
  }

  protected section(s: EmojiSection, rect: Rect, zIndex = 0) {
    const info = new LayoutInfo("section", s.id, rect);
    info.allowOverflow = true;
    this.infos.set(s.id, info);
    let header: LayoutInfo | null = null;
    if (s.header) {
      header = new LayoutInfo("header", `header:${s.id}`, new Rect(rect.x, rect.y, rect.width, this.metrics.headerHeight));
      header.parentKey = s.id;
      header.isSticky = true;
      header.zIndex = zIndex;
      this.infos.set(header.key, header);
    }
    const box = { key: s.id, info, header, rows: [] };
    this.sections.push(box);
    return box;
  }

  getLayoutInfo(key: Key) {
    const known = this.infos.get(key) ?? this.cellInfos.get(key);
    if (known) return known;
    const index = this.grid.indexOf(String(key));
    const at = this.grid.locate(index);
    if (!at) return null;
    const cell = this.place(index, at.row, at.column);
    const info = new LayoutInfo("item", key, new Rect(cell.x, cell.y, this.metrics.cellWidth, this.metrics.cellHeight));
    info.parentKey = at.section.id;
    this.cellInfos.set(key, info);
    return info;
  }

  getContentSize() {
    return this.size;
  }

  getVisibleLayoutInfos(rect: Rect) {
    const out: LayoutInfo[] = [];
    const seen = new Set<Key>();
    const add: Add = (info) => {
      if (info && !seen.has(info.key)) {
        seen.add(info.key);
        out.push(info);
      }
    };
    for (const box of this.sections) {
      if (!box.info.rect.intersects(rect)) continue;
      add(box.info);
      add(box.header);
      this.addCells(box, rect, add);
    }
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

  start(rect: Rect) {
    return rect[this.axis.start];
  }

  end(rect: Rect) {
    return rect[this.axis.end];
  }

  isVisible(key: Key, rect: Rect) {
    const r = this.getLayoutInfo(key)?.rect;
    return Boolean(r && this.end(r) > this.start(rect) && this.start(r) < this.end(rect));
  }

  sectionAt(offset: number): Key | null {
    let current: Key | null = null;
    for (const { key, info } of this.sections) {
      const start = this.start(info.rect);
      if (this.end(info.rect) > offset + 1 && (current == null || start <= offset + 1)) current = key;
      if (start > offset + 1) break;
    }
    return current;
  }
}

export class VerticalLayout extends EmojiGridLayout {
  readonly axis = Y;
  private x: (column: number) => number = () => 0;

  protected build(sections: EmojiSection[], { columns, results }: EmojiGridLayoutOptions) {
    const { cellWidth, cellHeight, headerHeight, padding, paddingEnd } = this.metrics;
    const width = this.virtualizer!.size.width;
    const rowWidth = Math.max(0, Math.round(columns ? Math.max(columns * cellWidth, width - 2 * padding) : width - padding - paddingEnd));
    const lanes = columns ?? Math.max(1, Math.floor(rowWidth / cellWidth));
    const gap = lanes > 1 ? Math.max(0, rowWidth - lanes * cellWidth) / (lanes - 1) : 0;
    this.x = (lane) => padding + (results ? lane * (cellWidth + gap) : Math.round(lane * (cellWidth + gap)));
    this.grid = createEmojiGrid(sections, { columns: lanes, rowHeight: cellHeight, headerHeight, padding: results === "ranked" ? padding : 0 });
    let box: SectionBox | null = null;
    for (const [r, row] of this.grid.rows.entries()) {
      if (box?.key !== row.section.id) box = this.section(row.section, new Rect(0, box ? row.offset : 0, width, 0), results ? 1 : 2);
      box.info.rect.height = row.offset + row.size - box.info.rect.y;
      if (row.type === "emojis") box.rows.push(r);
    }
    if (box) box.info.rect.height = this.grid.size - box.info.rect.y;
    this.size = new Size(width, this.grid.size);
  }

  protected place(_: number, row: number, column: number) {
    return { x: this.x(column), y: this.grid.rows[row]!.offset };
  }

  protected addCells(box: SectionBox, rect: Rect, add: Add) {
    for (const r of box.rows) {
      const row = this.grid.rows[r]!;
      if (row.type === "emojis" && row.offset + row.size > rect.y && row.offset <= rect.maxY) for (const item of row.items) add(this.getLayoutInfo(item.id));
    }
  }

  firstVisible(rect: Rect) {
    const { headerHeight } = this.metrics;
    for (const row of this.grid.rows) if (row.type === "emojis" && row.offset + row.size > rect.y + (row.section.header ? headerHeight : 0) + 1 && row.offset < rect.maxY) return row.items[0]!.id;
    return null;
  }

  revealBy(key: Key, cell: Rect, rect: Rect) {
    const inset = this.grid.locate(this.grid.indexOf(String(key)))?.section.header ? this.metrics.headerHeight : 0;
    if (cell.y < rect.y + inset) return -(rect.y + inset - cell.y);
    return cell.maxY > rect.maxY ? cell.maxY - rect.maxY : null;
  }

  jumpTarget(section: Rect) {
    return section.y;
  }

  activeSection(rect: Rect) {
    return this.sectionAt(rect.y);
  }
}

export class HorizontalLayout extends EmojiGridLayout {
  readonly axis = X;

  protected build(sections: EmojiSection[], { rows = 5 }: EmojiGridLayoutOptions) {
    const strip = layoutStrip(
      sections.map((s) => ({ id: s.id, count: s.items.length })),
      { ...this.metrics, rows },
    );
    this.strip = strip;
    this.grid = createEmojiGrid(sections, { columns: strip.rows, rowHeight: 0 });
    for (const box of strip.sections) this.section(sections.find((s) => s.id === box.id)!, new Rect(box.x, 0, box.width, strip.height));
    this.size = new Size(strip.width, strip.height);
  }

  protected place(index: number) {
    return placeCell(this.strip!, index)!;
  }

  protected addCells(box: SectionBox, rect: Rect, add: Add) {
    const strip = this.strip!;
    const s = strip.sections.find((s) => s.id === box.key)!;
    const first = Math.max(0, Math.floor((rect.x - s.x) / strip.cellWidth));
    const last = Math.min(s.columns - 1, Math.floor((rect.maxX - s.x) / strip.cellWidth));
    for (let i = first * strip.rows; i < Math.min(s.count, (last + 1) * strip.rows); i++) add(this.getLayoutInfo(this.grid.at(s.start + i)!.id));
  }

  firstVisible(rect: Rect) {
    for (let i = 0; i < this.grid.count; i++) {
      const r = this.getLayoutInfo(this.grid.at(i)!.id)!.rect;
      if (r.maxX > rect.x + 1 && r.x < rect.maxX) return this.grid.at(i)!.id;
    }
    return null;
  }

  revealBy(_: Key, cell: Rect, rect: Rect) {
    const pad = this.metrics.padding;
    if (cell.x < rect.x) return cell.x - pad - rect.x;
    return cell.maxX > rect.maxX ? cell.maxX + pad - rect.maxX : null;
  }

  jumpTarget(section: Rect, viewport: number) {
    return Math.max(0, Math.min(section.x - this.metrics.padding, Math.max(0, this.size.width - viewport)));
  }

  // The strip's last section may be too narrow to reach the start, so the end of the scroll selects it
  activeSection(rect: Rect) {
    const end = this.size.width - rect.width;
    if (end > 0 && rect.x >= end - 1) return this.sections[this.sections.length - 1]?.key ?? null;
    return this.sectionAt(rect.x + this.metrics.padding + this.metrics.cellWidth / 2);
  }
}
