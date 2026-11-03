// Internal: geometry of the horizontal list (`<List orientation="horizontal">`).
// Sections sit side by side; each is a column-major grid with a fixed number of
// rows (item i is in column floor(i / rows), row i % rows), its title above its
// first column. Pure functions in pixels, so they can be tested without a DOM.
export type StripMetrics = {
  rows: number;
  cellWidth: number;
  cellHeight: number;
  /** Height of the title band above the cells. */
  headerHeight: number;
  /** Space before the first section and after the last. */
  padding: number;
  /** Space between sections. */
  sectionGap: number;
  /** Narrowest a section gets (room for its title when it has few emoji). */
  sectionMinWidth: number;
};

type StripSection = {
  id: string;
  /** Global index of the section's first item. */
  start: number;
  count: number;
  columns: number;
  /** Left edge of the section's first column. */
  x: number;
  width: number;
};

export type StripLayout = StripMetrics & {
  sections: StripSection[];
  /** Items in all sections. */
  total: number;
  width: number;
  height: number;
};

/** Where every section goes. Empty sections take no space. */
export function layoutStrip(input: readonly { id: string; count: number }[], metrics: StripMetrics): StripLayout {
  const rows = Math.max(1, Math.floor(metrics.rows));
  const sections: StripSection[] = [];
  let x = metrics.padding;
  let start = 0;
  for (const { id, count } of input) {
    if (count <= 0) continue;
    if (sections.length) x += metrics.sectionGap;
    const columns = Math.ceil(count / rows);
    const width = Math.max(columns * metrics.cellWidth, metrics.sectionMinWidth);
    sections.push({ id, start, count, columns, x, width });
    x += width;
    start += count;
  }
  return { ...metrics, rows, sections, total: start, width: sections.length ? x + metrics.padding : 0, height: metrics.headerHeight + rows * metrics.cellHeight };
}

/** Section index of a global item index, or -1. */
export function sectionOf(layout: StripLayout, index: number): number {
  const { sections } = layout;
  let lo = 0;
  let hi = sections.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = sections[mid]!;
    if (index < s.start) hi = mid - 1;
    else if (index >= s.start + s.count) lo = mid + 1;
    else return mid;
  }
  return -1;
}

export type CellPlace = { section: number; column: number; row: number; x: number; y: number };

/** Position of a global item index (x, y relative to the list), or null when out of range. */
export function placeCell(layout: StripLayout, index: number): CellPlace | null {
  const section = sectionOf(layout, index);
  if (section < 0) return null;
  const s = layout.sections[section]!;
  const i = index - s.start;
  const column = Math.floor(i / layout.rows);
  const row = i % layout.rows;
  return { section, column, row, x: s.x + column * layout.cellWidth, y: layout.headerHeight + row * layout.cellHeight };
}

export type VisibleRange = { section: number; first: number; last: number };

/**
 * Sections and items (global indices, inclusive) whose columns intersect [from, to).
 * Whole columns are rendered, so a column is in when any part of it is.
 */
export function visibleRange(layout: StripLayout, from: number, to: number): VisibleRange[] {
  const out: VisibleRange[] = [];
  const cw = layout.cellWidth || 1;
  layout.sections.forEach((s, section) => {
    const end = s.x + s.columns * cw;
    if (end <= from || s.x >= to) return;
    const firstColumn = Math.max(0, Math.floor((from - s.x) / cw));
    const lastColumn = Math.min(s.columns - 1, Math.ceil((to - s.x) / cw) - 1);
    if (lastColumn < firstColumn) return;
    out.push({ section, first: s.start + firstColumn * layout.rows, last: s.start + Math.min(s.count, (lastColumn + 1) * layout.rows) - 1 });
  });
  return out;
}

/** Sections whose box (title included) intersects [from, to): their titles render. */
export function visibleSections(layout: StripLayout, from: number, to: number): number[] {
  const out: number[] = [];
  layout.sections.forEach((s, i) => {
    if (s.x < to && s.x + s.width > from) out.push(i);
  });
  return out;
}

/**
 * The current section for a scroll position: the one under the viewport's start
 * edge (half a column in), or the last one once the strip is scrolled to its end,
 * so a short last section can still become current.
 */
export function activeSection(layout: StripLayout, scrollLeft: number, viewportWidth: number): number {
  const { sections } = layout;
  if (!sections.length) return -1;
  if (viewportWidth > 0 && scrollLeft + viewportWidth >= layout.width - 1 && scrollLeft > 0) return sections.length - 1;
  const probe = scrollLeft + layout.padding + layout.cellWidth / 2;
  let current = 0;
  for (let i = 0; i < sections.length; i++) if (sections[i]!.x <= probe) current = i;
  return current;
}

/** scrollLeft that puts a section's first column at the start (after the padding). */
export function sectionScrollLeft(layout: StripLayout, section: number, viewportWidth = 0): number {
  const s = layout.sections[section];
  if (!s) return 0;
  const max = Math.max(0, layout.width - viewportWidth);
  return Math.max(0, Math.min(s.x - layout.padding, viewportWidth ? max : Infinity));
}

/** scrollLeft that brings an item's column fully into view (unchanged when it already is). */
export function revealCell(layout: StripLayout, index: number, scrollLeft: number, viewportWidth: number): number {
  const place = placeCell(layout, index);
  if (!place) return scrollLeft;
  if (place.x < scrollLeft) return Math.max(0, place.x - layout.padding);
  const right = place.x + layout.cellWidth;
  if (right > scrollLeft + viewportWidth) return right + layout.padding - viewportWidth;
  return scrollLeft;
}

export type StripKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Home" | "End";

/**
 * The item a key moves to from `index`, or null at an edge (the caller may leave
 * the grid then). Up and Down stay in the column; Left and Right keep the row and
 * cross into the neighbouring section, landing on its nearest column that has
 * that row (or the closest row when the section is shorter). Home and End go to
 * the first and last item.
 */
export function moveInStrip(layout: StripLayout, index: number, key: StripKey): number | null {
  const { rows, sections, total } = layout;
  if (!total) return null;
  if (key === "Home") return index === 0 ? null : 0;
  if (key === "End") return index === total - 1 ? null : total - 1;
  const place = placeCell(layout, index);
  if (!place) return 0;
  const s = sections[place.section]!;
  const i = index - s.start;
  if (key === "ArrowUp") return place.row > 0 ? index - 1 : null;
  if (key === "ArrowDown") return place.row < rows - 1 && i + 1 < s.count ? index + 1 : null;
  const step = key === "ArrowRight" ? 1 : -1;
  // Same row, next column in this section, if that cell exists.
  const sameSection = i + step * rows;
  if (sameSection >= 0 && sameSection < s.count) return s.start + sameSection;
  const next = sections[place.section + step];
  if (!next) return null;
  // Into the neighbour: its first column going right, its last going left.
  const column = step > 0 ? 0 : next.columns - 1;
  const inColumn = Math.min(rows, next.count - column * rows);
  return next.start + column * rows + Math.min(place.row, inColumn - 1);
}

/** Whole columns visible in a viewport this wide (at least one). */
export function columnsPerPage(layout: StripLayout, viewportWidth: number): number {
  if (!(layout.cellWidth > 0)) return 1;
  return Math.max(1, Math.floor((viewportWidth - 2 * layout.padding) / layout.cellWidth));
}

/**
 * A page sideways: `columns` steps along the row (crossing sections as Left and
 * Right do), stopping at the first or last column. Null when no step is possible.
 */
export function pageInStrip(layout: StripLayout, index: number, direction: 1 | -1, columns: number): number | null {
  const key: StripKey = direction > 0 ? "ArrowRight" : "ArrowLeft";
  let current = index;
  for (let i = 0; i < Math.max(1, columns); i++) {
    const next = moveInStrip(layout, current, key);
    if (next == null) break;
    current = next;
  }
  return current === index ? null : current;
}
