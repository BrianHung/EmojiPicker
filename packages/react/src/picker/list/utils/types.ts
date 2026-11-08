import type * as React from "react";
import type { Key, LayoutDelegate } from "@react-types/shared";
import type { EmojiSection } from "@brianhung/emoji-picker-core";
import type { EmojiGrid } from "@brianhung/emoji-picker-core/grid";
import type { EmojiCollection } from "./collection";
import type { GridKeyboardDelegate } from "./navigation";

// Where the grid is on screen: the List's virtualizer or an app's own scroller answers these
export interface GridGeometry {
  grid(): EmojiGrid<EmojiSection>;
  navigation: GridKeyboardDelegate;
  layoutDelegate?: LayoutDelegate;
  firstVisible(): Key | null;
  isVisible(key: Key): boolean;
  reveal(key: Key, from?: Key): void;
  viewport(): number;
  jump(section: string, instant: boolean): boolean;
  overlay(key: Key, cell: Element | null): React.CSSProperties;
}

// The values handlers read after the render that made them
export interface GridLatest {
  collection: EmojiCollection;
  virtual: boolean;
  geometry: GridGeometry;
  searching: boolean;
  rtl: boolean;
}

export type CellElement = (key: Key | null | undefined) => HTMLElement | null;

// What the cells on screen tell the grid after each render
export interface Rendered {
  unifieds: readonly string[];
  // The section at the top, when known
  section?: string | null;
  // false while a jump scrolls toward its section: the stop and the active section wait for it
  settled: boolean;
}
