// Keyboard navigation over the grid's rows (core/grid), or the horizontal strip, as a React Aria
// KeyboardDelegate. React Aria's ListKeyboardDelegate moves Down to the next item with the same
// x, skipping a short last row; this one clamps to it. Directions are logical; callers mirror for RTL.
import type { Key, KeyboardDelegate } from "@react-types/shared";
import { moveInGrid, rowsPerPage, type EmojiGrid, type EmojiGridMove } from "../core/grid";
import type { EmojiSection } from "./sections";
import { columnsPerPage, moveInStrip, pageInStrip, type StripKey, type StripLayout } from "./strip-layout";

export type NavigationSource = { grid: EmojiGrid<EmojiSection>; strip: StripLayout | null; metrics: { cellHeight: number; headerHeight: number } };

const STRIP: Partial<Record<EmojiGridMove, StripKey>> = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };

export class EmojiGridNavigation implements KeyboardDelegate {
  constructor(private source: () => NavigationSource) {}

  /** Where a move from `key` lands (a page is what fits in `viewport` px), or null at an edge. */
  move(key: Key, move: EmojiGridMove, viewport = 0): Key | null {
    const { grid, strip, metrics } = this.source();
    const index = grid.indexOf(String(key));
    const page = move === "page-up" || move === "page-down";
    const next =
      strip && STRIP[move] ? moveInStrip(strip, index, STRIP[move]) : strip && page ? pageInStrip(strip, index, move === "page-down" ? 1 : -1, columnsPerPage(strip, viewport)) : moveInGrid(grid, index, move, rowsPerPage(viewport, metrics.cellHeight, metrics.headerHeight));
    return index < 0 || next == null ? null : (grid.at(next)?.id ?? null);
  }

  getKeyBelow = (key: Key) => this.move(key, "down");
  getKeyAbove = (key: Key) => this.move(key, "up");
  getKeyRightOf = (key: Key) => this.move(key, "right");
  getKeyLeftOf = (key: Key) => this.move(key, "left");
  getFirstKey = () => this.source().grid.at(0)?.id ?? null;
  getLastKey = () => this.source().grid.at(this.source().grid.count - 1)?.id ?? null;

  /** Type-to-select (no search field): the first emoji from `fromKey` on whose name starts with the text. */
  getKeyForSearch = (search: string, fromKey?: Key | null) => {
    const { grid } = this.source();
    const text = search.toLocaleLowerCase();
    const start = Math.max(0, fromKey == null ? 0 : grid.indexOf(String(fromKey)));
    for (let n = 0; n < grid.count; n++) {
      const item = grid.at((start + n) % grid.count)!;
      if (item.label.toLocaleLowerCase().startsWith(text)) return item.id;
    }
    return null;
  };
}
