// Internal: keys the engine's vertical List doesn't handle itself. The engine owns
// focus there (arrows, Space for variations, type-to-search); this adds pages and
// first/last by driving it through its own markup and keys.
import { ENGINE_CELL as CELL, focusEngineEdge } from "./engine-highlight";
import { rowsPerPage } from "./grid-nav";
import { resendKey, type RegionHandler } from "./keyboard";

const SCROLLER = ".epr-body";
const CATEGORY = ".epr-emoji-category";

/**
 * PageUp/PageDown move by the rows that fit under the sticky title, as that many
 * Up/Down presses (Shift held, which keeps the engine from leaving the grid at
 * its ends). The engine chains repeated moves, so this is one smooth jump.
 */
export const engineGridKeys: RegionHandler = (action, event) => {
  const cell = (event.target as Element).closest<HTMLElement>(CELL);
  const scroller = cell?.closest<HTMLElement>(SCROLLER);
  if (!cell || !scroller) return "pass";
  if (action === "first" || action === "last") {
    focusEngineEdge(scroller, action);
    return "handled";
  }
  if (action === "page-up" || action === "page-down") {
    const header = cell.closest(CATEGORY)?.querySelector<HTMLElement>('[data-slot="category-header"]');
    const rows = rowsPerPage(scroller.clientHeight, cell.offsetHeight, header?.offsetHeight ?? 0);
    for (let i = 0; i < rows; i++) {
      // A rendered target takes focus at once (send the next key from there); an
      // unrendered one later, and the engine chains the next key from its target.
      const active = document.activeElement;
      const from = active instanceof HTMLElement && active.matches(CELL) && scroller.contains(active) ? active : cell;
      resendKey(from, action === "page-down" ? "ArrowDown" : "ArrowUp", { shiftKey: true });
    }
    return "handled";
  }
  return "pass";
};
