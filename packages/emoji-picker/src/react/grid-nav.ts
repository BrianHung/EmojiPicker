// Page size and position-based movement for grids that aren't one uniform
// row-major grid (grouped search results, sections of different lengths). Pure.

/**
 * Rows that fit in one page of a scroller: whole rows in its height minus what
 * sticks over the top (a section title). At least one, so PageDown always moves.
 */
export function rowsPerPage(viewportSize: number, rowSize: number, inset = 0): number {
  if (!(rowSize > 0)) return 1;
  return Math.max(1, Math.floor((viewportSize - Math.max(0, inset)) / rowSize));
}

export type Point = { x: number; y: number };

const ROW_TOLERANCE = 1;

/**
 * The cell `distance` rows above (negative) or below (positive) `from`, keeping
 * the column as close as possible. Rows are cells sharing a `y`, so sections and
 * headers between them don't matter. Past the last row in that direction it lands
 * on that last row; null when `from` is already on it.
 */
export function moveByRows(points: readonly Point[], from: number, distance: number): number | null {
  const origin = points[from];
  if (!origin || distance === 0) return null;
  const down = distance > 0;
  const rows = [...new Set(points.map((p) => Math.round(p.y)))]
    .filter((y) => (down ? y > origin.y + ROW_TOLERANCE : y < origin.y - ROW_TOLERANCE))
    .sort((a, b) => (down ? a - b : b - a));
  if (!rows.length) return null;
  const rowY = rows[Math.min(Math.abs(distance), rows.length) - 1]!;
  let best = -1;
  let bestGap = Infinity;
  points.forEach((p, i) => {
    if (Math.abs(Math.round(p.y) - rowY) > ROW_TOLERANCE) return;
    const gap = Math.abs(p.x - origin.x);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return best < 0 ? null : best;
}
