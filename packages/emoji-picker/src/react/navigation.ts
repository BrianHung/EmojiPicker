// Keyboard navigation over EmojiGridLayout's geometry, as a React Aria KeyboardDelegate.
// React Aria's ListKeyboardDelegate moves Down to the next item with the same x, so
// from a column a short last row doesn't reach, Down skips that row; this one clamps
// to the row's last cell and crosses into the next section, as the picker always has.
// Directions are logical (Left is "before" in reading order); callers mirror for RTL.
import type { Collection, Key, KeyboardDelegate, Node } from "@react-types/shared";
import type { EmojiGridLayout } from "./layout";
import { moveInStrip, pageInStrip, type StripKey } from "./strip-layout";

export class EmojiGridNavigation implements KeyboardDelegate {
  constructor(private layout: EmojiGridLayout) {}

  private get collection(): Collection<Node<unknown>> | undefined {
    return this.layout.virtualizer?.collection;
  }

  private at(key: Key) {
    const p = this.layout.positions.get(key);
    return p ? { group: this.layout.groups[p[0]]!, g: p[0], i: p[1] } : null;
  }

  private get horizontal() {
    return this.layout.orientation === "horizontal";
  }

  /** Global index in a horizontal strip ↔ key. */
  private flat(key: Key) {
    const p = this.at(key);
    if (!p) return -1;
    let index = p.i;
    for (let g = 0; g < p.g; g++) index += this.layout.groups[g]!.keys.length;
    return index;
  }

  private keyAt(index: number | null): Key | null {
    if (index == null) return null;
    for (const g of this.layout.groups) {
      if (index < g.keys.length) return g.keys[index]!;
      index -= g.keys.length;
    }
    return null;
  }

  private stripMove(key: Key, move: StripKey) {
    const strip = this.layout.strip;
    return strip ? this.keyAt(moveInStrip(strip, this.flat(key), move)) : null;
  }

  /** The next cell in reading order, across sections. */
  private step(key: Key, by: 1 | -1): Key | null {
    const p = this.at(key);
    if (!p) return null;
    const next = p.group.keys[p.i + by];
    if (next != null) return next;
    for (let g = p.g + by; g >= 0 && g < this.layout.groups.length; g += by) {
      const keys = this.layout.groups[g]!.keys;
      if (keys.length) return by === 1 ? keys[0]! : keys[keys.length - 1]!;
    }
    return null;
  }

  /** The cell one row down (or up), clamped to a short row, crossing into the next section. */
  private line(key: Key, by: 1 | -1): Key | null {
    const p = this.at(key);
    if (!p) return null;
    const lanes = this.layout.lanes;
    const lane = p.i % lanes;
    const row = Math.floor(p.i / lanes) + by;
    if (row >= 0 && row <= Math.floor((p.group.keys.length - 1) / lanes)) return p.group.keys[Math.min(row * lanes + lane, p.group.keys.length - 1)]!;
    for (let g = p.g + by; g >= 0 && g < this.layout.groups.length; g += by) {
      const keys = this.layout.groups[g]!.keys;
      if (!keys.length) continue;
      const start = by === 1 ? 0 : Math.floor((keys.length - 1) / lanes) * lanes;
      return keys[Math.min(start + lane, keys.length - 1)]!;
    }
    return null;
  }

  getKeyBelow = (key: Key) => (this.horizontal ? this.stripMove(key, "ArrowDown") : this.line(key, 1));
  getKeyAbove = (key: Key) => (this.horizontal ? this.stripMove(key, "ArrowUp") : this.line(key, -1));
  getKeyRightOf = (key: Key) => (this.horizontal ? this.stripMove(key, "ArrowRight") : this.step(key, 1));
  getKeyLeftOf = (key: Key) => (this.horizontal ? this.stripMove(key, "ArrowLeft") : this.step(key, -1));
  getFirstKey = () => this.layout.groups.find((g) => g.keys.length)?.keys[0] ?? null;
  getLastKey = () => {
    const groups = this.layout.groups.filter((g) => g.keys.length);
    const last = groups[groups.length - 1];
    return last ? last.keys[last.keys.length - 1]! : null;
  };

  /** A page: as many whole rows (columns, horizontally) as fit in `viewport` px under a stuck header. */
  page(key: Key, by: 1 | -1, viewport: number): Key | null {
    const { cellWidth, cellHeight, headerHeight, padding } = this.layout.metrics;
    if (this.horizontal) {
      const strip = this.layout.strip;
      const columns = Math.max(1, Math.floor((viewport - 2 * padding) / cellWidth));
      return strip ? this.keyAt(pageInStrip(strip, this.flat(key), by, columns)) : null;
    }
    const rows = Math.max(1, Math.floor((viewport - headerHeight) / cellHeight));
    let current = key;
    for (let n = 0; n < rows; n++) {
      const next = this.line(current, by);
      if (next == null) break;
      current = next;
    }
    return current === key ? null : current;
  }
  getKeyPageBelow = (key: Key) => this.page(key, 1, this.layout.getVisibleRect().height);
  getKeyPageAbove = (key: Key) => this.page(key, -1, this.layout.getVisibleRect().height);

  /** Type-to-select (no search field): the first cell after `fromKey` whose name starts with the text. */
  getKeyForSearch = (search: string, fromKey?: Key | null) => {
    const collection = this.collection;
    if (!collection) return null;
    const text = search.toLocaleLowerCase();
    const start = fromKey ?? this.getFirstKey();
    let key = start;
    while (key != null) {
      if (collection.getItem(key)?.textValue.toLocaleLowerCase().startsWith(text)) return key;
      key = this.step(key, 1) ?? this.getFirstKey();
      if (key === start) break;
    }
    return null;
  };
}
