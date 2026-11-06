import type { EmojiGridMove } from "../keys";
import { type EmojiGrid, moveInGrid, rowsPerPage } from "./grid";
import type { EmojiSection } from "./sections";
import { columnsPerPage, moveInStrip, type StripLayout } from "./strip";

export interface NavigationSource {
  grid: EmojiGrid<EmojiSection>;
  strip: StripLayout | null;
  metrics: { cellHeight: number; headerHeight: number };
}

// Keyboard navigation over a laid-out grid or strip, by item id
export interface EmojiGridNavigation {
  move(id: string, move: EmojiGridMove, viewport?: number): string | null;
  first(): string | null;
  last(): string | null;
  search(text: string, from?: string | null): string | null;
}

export function createGridNavigation(source: () => NavigationSource): EmojiGridNavigation {
  const navigation: EmojiGridNavigation = {
    move(id, move, viewport = 0) {
      const { grid, strip, metrics } = source();
      const index = grid.indexOf(id);
      if (index < 0) return null;
      const next = strip ? moveInStrip(strip, index, move, columnsPerPage(strip, viewport)) : moveInGrid(grid, index, move, rowsPerPage(viewport, metrics.cellHeight, metrics.headerHeight));
      return next == null ? null : (grid.at(next)?.id ?? null);
    },
    first: () => source().grid.at(0)?.id ?? null,
    last: () => {
      const { grid } = source();
      return grid.at(grid.count - 1)?.id ?? null;
    },
    search(text, from) {
      const { grid } = source();
      const needle = text.toLocaleLowerCase();
      const start = Math.max(0, from == null ? 0 : grid.indexOf(from));
      for (let n = 0; n < grid.count; n++) {
        const item = grid.at((start + n) % grid.count)!;
        if (item.label.toLocaleLowerCase().startsWith(needle)) return item.id;
      }
      return null;
    },
  };
  return navigation;
}
