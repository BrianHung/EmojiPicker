// The picker's grid as rows: a section title, then its emoji in rows of `columns`. Pure: the
// default list's layout and keyboard, and any virtualizer you bring, read the same rows.

export type EmojiGridSection = { id: string; items: readonly { id: string }[]; header?: boolean };

export type EmojiGridOptions = {
  columns: number;
  rowHeight: number;
  headerHeight?: number;
  /** Space before the first row and after the last. */
  padding?: number;
};

export type EmojiGridRow<S extends EmojiGridSection = EmojiGridSection> =
  | { type: "header"; key: string; section: S; offset: number; size: number }
  /** `start`: the index of the row's first emoji in the whole grid. */
  | { type: "emojis"; key: string; section: S; items: S["items"]; start: number; offset: number; size: number };

export type EmojiGrid<S extends EmojiGridSection = EmojiGridSection> = {
  rows: EmojiGridRow<S>[];
  /** Header rows, for sticky titles. */
  stickyIndexes: number[];
  size: number;
  columns: number;
  count: number;
  at(index: number): S["items"][number] | undefined;
  indexOf(id: string): number;
  /** Where an emoji is: its row, column, section, and index within the section. */
  locate(index: number): { row: number; column: number; section: S; index: number } | null;
};

export type EmojiGridMove = "up" | "down" | "left" | "right" | "page-up" | "page-down" | "first" | "last";

export function createEmojiGrid<S extends EmojiGridSection>(sections: readonly S[], { columns, rowHeight, headerHeight = 0, padding = 0 }: EmojiGridOptions): EmojiGrid<S> {
  const cols = Math.max(1, Math.floor(columns));
  const rows: EmojiGridRow<S>[] = [];
  const stickyIndexes: number[] = [];
  const emojiRows: number[] = [];
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
      emojiRows.push(rows.length);
      sectionStart.push(count);
      rows.push({ type: "emojis", key: `${section.id}:${i}`, section, items: section.items.slice(i, i + cols) as S["items"], start: count + i, offset, size: rowHeight });
      offset += rowHeight;
    }
    count += section.items.length;
  }
  const rowAt = (index: number) => {
    let lo = 0;
    let hi = emojiRows.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((rows[emojiRows[mid]!] as { start: number }).start <= index) lo = mid;
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
      const r = index >= 0 && index < count ? rows[emojiRows[rowAt(index)]!] : undefined;
      return r?.type === "emojis" ? r.items[index - r.start] : undefined;
    },
    indexOf: (id) => ids.get(id) ?? -1,
    locate(index) {
      if (!(index >= 0 && index < count)) return null;
      const k = rowAt(index);
      const row = rows[emojiRows[k]!] as Extract<EmojiGridRow<S>, { type: "emojis" }>;
      return { row: emojiRows[k]!, column: index - row.start, section: row.section, index: index - sectionStart[k]! };
    },
  };
}

/** Whole rows in a viewport, under what sticks over its top (a title). At least one. */
export function rowsPerPage(viewport: number, rowHeight: number, inset = 0): number {
  return rowHeight > 0 ? Math.max(1, Math.floor((viewport - Math.max(0, inset)) / rowHeight)) : 1;
}

/**
 * The emoji a move lands on, or null at an edge. Left and Right go in reading order across
 * sections; Up and Down keep the column, clamped to a short row, across section titles.
 */
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
  let target = index;
  for (let n = move.startsWith("page") ? Math.max(1, pageRows) : 1; n > 0; n--) {
    let r = row + by;
    while (grid.rows[r]?.type === "header") r += by;
    const next = grid.rows[r];
    if (next?.type !== "emojis") break;
    target = next.start + Math.min(target - (grid.rows[row] as { start: number }).start, next.items.length - 1);
    row = r;
  }
  return target === index ? null : target;
}
