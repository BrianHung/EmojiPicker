import type { EmojiGridMove } from "../keys";

export interface EmojiGridSection {
  readonly id: string;
  readonly items: readonly { readonly id: string }[];
  readonly header?: boolean;
}

export interface EmojiGridOptions {
  columns: number;
  rowHeight: number;
  headerHeight?: number;
  padding?: number;
}

export type EmojiGridRow<S extends EmojiGridSection = EmojiGridSection> =
  | { type: "header"; key: string; section: S; offset: number; size: number }
  | { type: "emojis"; key: string; section: S; items: readonly S["items"][number][]; start: number; offset: number; size: number };

type EmojisRow<S extends EmojiGridSection> = Extract<EmojiGridRow<S>, { type: "emojis" }>;

export interface EmojiGrid<S extends EmojiGridSection = EmojiGridSection> {
  rows: readonly EmojiGridRow<S>[];
  stickyIndexes: readonly number[];
  size: number;
  columns: number;
  count: number;
  at(index: number): S["items"][number] | undefined;
  indexOf(id: string): number;
  locate(index: number): { row: number; column: number; section: S; index: number } | null;
}

export type { EmojiGridMove };

export function createEmojiGrid<S extends EmojiGridSection>(sections: readonly S[], { columns, rowHeight, headerHeight = 0, padding = 0 }: EmojiGridOptions): EmojiGrid<S> {
  const cols = Math.max(1, Math.floor(columns));
  const rows: EmojiGridRow<S>[] = [];
  const stickyIndexes: number[] = [];
  const emojiRows: EmojisRow<S>[] = [];
  const emojiRowIndex: number[] = [];
  const sectionStart: number[] = [];
  const ids = new Map<string, number>();
  let offset = padding;
  let count = 0;
  for (const section of sections) {
    if (section.header) {
      stickyIndexes.push(rows.length);
      rows.push({ type: "header", key: section.id, section, offset, size: headerHeight });
      offset += headerHeight;
    }
    section.items.forEach((item, i) => ids.set(item.id, count + i));
    for (let i = 0; i < section.items.length; i += cols) {
      const row: EmojisRow<S> = { type: "emojis", key: `${section.id}:${i}`, section, items: section.items.slice(i, i + cols), start: count + i, offset, size: rowHeight };
      emojiRowIndex.push(rows.length);
      emojiRows.push(row);
      sectionStart.push(count);
      rows.push(row);
      offset += rowHeight;
    }
    count += section.items.length;
  }
  const rowAt = (index: number) => {
    let lo = 0;
    let hi = emojiRows.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (emojiRows[mid]!.start <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  return {
    rows,
    stickyIndexes,
    size: offset + padding,
    columns: cols,
    count,
    at(index) {
      const r = index >= 0 && index < count ? emojiRows[rowAt(index)] : undefined;
      return r?.items[index - r.start];
    },
    indexOf: (id) => ids.get(id) ?? -1,
    locate(index) {
      if (!(index >= 0 && index < count)) return null;
      const k = rowAt(index);
      const row = emojiRows[k]!;
      return { row: emojiRowIndex[k]!, column: index - row.start, section: row.section, index: index - sectionStart[k]! };
    },
  };
}

export function rowsPerPage(viewport: number, rowHeight: number, inset = 0): number {
  return rowHeight > 0 ? Math.max(1, Math.floor((viewport - Math.max(0, inset)) / rowHeight)) : 1;
}

export function moveInGrid(grid: EmojiGrid, index: number, move: EmojiGridMove, pageRows = 1): number | null {
  const last = grid.count - 1;
  const at = grid.locate(index);
  if (!at) return null;
  if (move === "first" || move === "last") return move === "first" ? 0 : last;
  if (move === "left" || move === "right") {
    const next = index + (move === "right" ? 1 : -1);
    return next >= 0 && next <= last ? next : null;
  }
  const by = move === "down" || move === "page-down" ? 1 : -1;
  let row = at.row;
  let start = index - at.column;
  let target = index;
  for (let n = move.startsWith("page") ? Math.max(1, pageRows) : 1; n > 0; n--) {
    let r = row + by;
    while (grid.rows[r]?.type === "header") r += by;
    const next = grid.rows[r];
    if (next?.type !== "emojis") break;
    target = next.start + Math.min(target - start, next.items.length - 1);
    start = next.start;
    row = r;
  }
  return target === index ? null : target;
}
