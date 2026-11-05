export type StripMetrics = {
  rows: number;
  cellWidth: number;
  cellHeight: number;
  headerHeight: number;
  padding: number;
  sectionGap: number;
  sectionMinWidth: number;
};

type StripSection = {
  id: string;
  start: number;
  count: number;
  columns: number;
  x: number;
  width: number;
};

export type StripLayout = StripMetrics & {
  sections: StripSection[];
  total: number;
  width: number;
  height: number;
};

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

type CellPlace = { section: number; column: number; row: number; x: number; y: number };

export function placeCell(layout: StripLayout, index: number): CellPlace | null {
  const section = sectionOf(layout, index);
  if (section < 0) return null;
  const s = layout.sections[section]!;
  const i = index - s.start;
  const column = Math.floor(i / layout.rows);
  const row = i % layout.rows;
  return { section, column, row, x: s.x + column * layout.cellWidth, y: layout.headerHeight + row * layout.cellHeight };
}

export type StripKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Home" | "End";

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
  const sameSection = i + step * rows;
  if (sameSection >= 0 && sameSection < s.count) return s.start + sameSection;
  const next = sections[place.section + step];
  if (!next) return null;
  const column = step > 0 ? 0 : next.columns - 1;
  const inColumn = Math.min(rows, next.count - column * rows);
  return next.start + column * rows + Math.min(place.row, inColumn - 1);
}

export function columnsPerPage(layout: StripLayout, viewportWidth: number): number {
  if (!(layout.cellWidth > 0)) return 1;
  return Math.max(1, Math.floor((viewportWidth - 2 * layout.padding) / layout.cellWidth));
}

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
