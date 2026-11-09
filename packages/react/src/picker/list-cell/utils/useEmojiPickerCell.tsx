"use client";

import type { EmojiPickerListCellState } from "../EmojiPickerListCell";
import * as EmojiPickerListCellDataAttributes from "../EmojiPickerListCellDataAttributes";
import * as React from "react";
import type { Key } from "@react-types/shared";
import type { ListState } from "react-stately/useListState";
import type { EmojiItem, EmojiPickerStore, EmojiPickerSnapshot } from "@emoji-components/core";
import { Glyph, useOverridden } from "../../../emoji/Glyph";
import { flag, stateAttributes } from "../../../internals/renderElement";
import { SLOTS } from "../../../internals/slots";
import { useStore } from "../../../utils/useStore";
import { moveVirtualFocus } from "../../../utils/dom";
import { useLayoutEffect } from "../../../utils/useLayoutEffect";

const STOP = 1;
const HIGHLIGHTED = 2;
const HOVERED = 4;
const PRESSED = 8;
const FOCUSED = 16;

// Focused: the keyboard position, by DOM or virtual focus. Highlighted, as in Base UI: that position once the keyboard moves it (focus on open alone doesn't count), or the hovered cell while there is none
const flagsOf = ({ hovered, highlighted, tabStop, pressed }: EmojiPickerSnapshot, key: Key) =>
  (hovered === key ? ((highlighted ?? key) === key ? HIGHLIGHTED | HOVERED : HOVERED) : 0) | (highlighted === key ? FOCUSED : 0) | (tabStop === key ? STOP : 0) | (pressed === key ? PRESSED : 0);

// Handlers are delegated from the list: one set for every mounted cell
export const cellOf = (target: EventTarget | null) => (target instanceof Element ? target.closest(`[data-slot="${SLOTS.listCell}"]`) : null);
export const keyOf = (e: React.SyntheticEvent) => cellOf(e.target)?.getAttribute("data-key") ?? null;

export type CellPosition = readonly [posinset: number, setsize: number, index: number, row: number, column: number];

export interface Cells {
  selection: ListState<unknown>["selectionManager"];
  listId: string;
  collectionId?: string;
  focusVisible: boolean;
  position: (id: Key) => CellPosition | undefined;
  virtual: boolean;
  elements: Map<Key, HTMLElement>;
  headers: Set<HTMLElement>;
  picker: EmojiPickerStore<React.ReactNode>;
  target(): Element | null;
  reveal(id: Key): void;
  sectionDomId(id: string): string;
  toggle(id: string): void;
}

const ATTRIBUTES = ["selected", "hovered", "focused", "focusVisible", "pressed", "highlighted"] as const;

function cellProps(cells: Cells, item: EmojiItem, flags: number, overridden: boolean) {
  const { selection: m } = cells;
  const { record, unified } = item;
  const position = cells.position(item.id);
  const focused = Boolean(flags & FOCUSED);
  const variations = record.tones.length > 0 && !record.imageUrl;
  const state: EmojiPickerListCellState = {
    emoji: item,
    row: position?.[3] ?? 0,
    column: position?.[4] ?? 0,
    highlighted: (focused && (cells.virtual || cells.focusVisible)) || Boolean(flags & HIGHLIGHTED),
    hovered: Boolean(flags & HOVERED),
    focused,
    focusVisible: focused && cells.focusVisible,
    pressed: Boolean(flags & PRESSED),
    selected: m.selectionMode !== "none" && m.isSelected(item.id),
  };
  const props = {
    id: `${cells.listId}-option-${item.id}`,
    role: "option",
    "aria-label": item.label,
    "aria-selected": m.selectionMode === "none" ? undefined : state.selected,
    "aria-posinset": position?.[0],
    "aria-setsize": position?.[1],
    "aria-keyshortcuts": variations ? "Shift+Space" : undefined,
    tabIndex: flags & STOP ? 0 : -1,
    "data-slot": SLOTS.listCell,
    "data-key": item.id,
    "data-collection": cells.collectionId,
    [EmojiPickerListCellDataAttributes.unified]: unified,
    [EmojiPickerListCellDataAttributes.index]: position?.[2],
    [EmojiPickerListCellDataAttributes.row]: position?.[3],
    [EmojiPickerListCellDataAttributes.column]: position?.[4],
    ...stateAttributes(state, ATTRIBUTES),
    [EmojiPickerListCellDataAttributes.overridden]: flag(overridden),
    [EmojiPickerListCellDataAttributes.hasVariations]: flag(variations),
    children: <Glyph unified={unified} record={record} animate={state.highlighted && Boolean(record.animated)} />,
  };
  return { props, state };
}

let cellsOf: (state: EmojiPickerGridState) => Cells;
export let gridStateOf: (cells: Cells) => EmojiPickerGridState;
// What useEmojiPickerGrid hands its cells; opaque outside the package
export type EmojiPickerGridState = GridState;
class GridState {
  readonly #cells: Cells;
  private constructor(cells: Cells) {
    this.#cells = cells;
  }
  static {
    cellsOf = (state) => state.#cells;
    gridStateOf = (cells) => new GridState(cells);
  }
}

export interface UseEmojiPickerCellResult {
  cellProps: React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void; [data: `data-${string}`]: string | number | true | undefined };
  state: EmojiPickerListCellState;
}

export function useCell(grid: Cells, item: EmojiItem): UseEmojiPickerCellResult {
  const overridden = useOverridden(item.unified, item.record);
  const flags = useStore(grid.picker, (s) => flagsOf(s, item.id));
  const element = React.useRef<HTMLElement | null>(null);
  const ref = React.useCallback(
    (el: HTMLElement | null) => {
      if (element.current && grid.elements.get(item.id) === element.current) grid.elements.delete(item.id);
      element.current = el;
      if (!el) return;
      // React Aria's scrollIntoViewport would scroll the page too; the keyboard moves already scrolled the scroller
      el.scrollIntoView = () => grid.reveal(item.id);
      grid.elements.set(item.id, el);
    },
    [grid, item.id],
  );
  const focused = Boolean(flags & FOCUSED);
  const { virtual, target } = grid;
  useLayoutEffect(() => {
    const el = element.current;
    if (!el || !focused) return;
    if (virtual) moveVirtualFocus(el, target());
    else if (el.ownerDocument.activeElement !== el) el.focus({ preventScroll: true });
  }, [focused, virtual, target]);
  const { props, state } = cellProps(grid, item, flags, overridden);
  return { cellProps: { ...props, ref }, state };
}

export const useEmojiPickerCell = (state: EmojiPickerGridState, item: EmojiItem): UseEmojiPickerCellResult => useCell(cellsOf(state), item);
