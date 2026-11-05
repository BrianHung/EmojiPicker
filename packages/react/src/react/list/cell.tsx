import * as React from "react";
import type { Key } from "@react-types/shared";
import type { ListState } from "react-stately/useListState";
import { createStore, type EmojiItem, type PickerSnapshot, type PickerState } from "@brianhung/emoji-picker-core";
import { Glyph, useOverridden } from "../emoji/glyph";
import { SLOTS } from "../utils/slots";
import { useStore } from "../utils/store";
import { moveVirtualFocus } from "../utils/utils";

const STOP = 1;
const ACTIVE = 2;
const HOVERED = 4;
const PRESSED = 8;
const FOCUSED = 16;
type Marks = { stop: Key | null; pressed: Key | null };

export const createMarks = () => createStore<Marks, Partial<Marks>>({ stop: null, pressed: null }, (marks, patch) => ((Object.keys(patch) as (keyof Marks)[]).every((k) => Object.is(marks[k], patch[k])) ? marks : { ...marks, ...patch }));
export type MarksStore = ReturnType<typeof createMarks>;

const pickerFlags = ({ hovered, highlighted }: PickerSnapshot, key: Key) => ((highlighted ?? hovered) === key ? ACTIVE : 0) | (hovered === key ? HOVERED : 0) | (highlighted === key ? FOCUSED : 0);
const markFlags = ({ stop, pressed }: Marks, key: Key) => (stop === key ? STOP : 0) | (pressed === key ? PRESSED : 0);

// Handlers are delegated from the list: one set for every mounted cell
export const cellOf = (target: EventTarget | null) => (target instanceof Element ? target.closest(`[data-slot="${SLOTS.emoji}"]`) : null);
export const keyOf = (e: React.SyntheticEvent) => cellOf(e.target)?.getAttribute("data-key") ?? null;

export type Cells = {
  selection: ListState<unknown>["selectionManager"];
  listId: string;
  collectionId?: string;
  focusVisible: boolean;
  position: (id: Key) => readonly [posinset: number, setsize: number, index: number, row: number, column: number] | undefined;
  virtual: boolean;
  elements: Map<Key, HTMLElement>;
  headers: Set<HTMLElement>;
  picker: PickerState<React.ReactNode>;
  marks: MarksStore;
  target(): Element | null;
  reveal(id: Key): void;
  sectionDomId(id: string): string;
  toggle(id: string): void;
};

export type CellState = { emoji: EmojiItem; row: number; column: number; highlighted: boolean; active: boolean; hovered: boolean; focused: boolean; focusVisible: boolean; pressed: boolean; selected: boolean };

function cellProps(cells: Cells, item: EmojiItem, flags: number, overridden: boolean) {
  const { selection: m } = cells;
  const { record, unified } = item;
  const position = cells.position(item.id);
  const isFocused = Boolean(flags & FOCUSED);
  const isSelected = m.selectionMode !== "none" && m.isSelected(item.id);
  const highlighted = cells.virtual && isFocused;
  const isActive = Boolean(flags & ACTIVE) || highlighted;
  const props = {
    id: `${cells.listId}-option-${item.id}`,
    role: "option",
    "aria-label": item.label,
    "aria-selected": m.selectionMode === "none" ? undefined : isSelected,
    "aria-posinset": position?.[0],
    "aria-setsize": position?.[1],
    tabIndex: flags & STOP ? 0 : -1,
    "data-slot": SLOTS.emoji,
    "data-key": item.id,
    "data-collection": cells.collectionId,
    "data-unified": unified,
    "data-index": position?.[2],
    "data-row": position?.[3],
    "data-column": position?.[4],
    "data-selected": isSelected || undefined,
    "data-hovered": flags & HOVERED ? true : undefined,
    "data-focused": isFocused || undefined,
    "data-focus-visible": (isFocused && cells.focusVisible) || undefined,
    "data-pressed": flags & PRESSED ? true : undefined,
    "data-highlighted": highlighted ? "" : undefined,
    "data-active": isActive ? "" : undefined,
    "data-overridden": overridden ? "" : undefined,
    "data-has-variations": record.tones.length && !record.imageUrl ? "" : undefined,
    children: <Glyph unified={unified} record={record} animate={isActive && Boolean(record.animated)} />,
  };
  const state: CellState = {
    emoji: item,
    row: position?.[3] ?? 0,
    column: position?.[4] ?? 0,
    highlighted,
    active: isActive,
    hovered: Boolean(flags & HOVERED),
    focused: isFocused,
    focusVisible: isFocused && cells.focusVisible,
    pressed: Boolean(flags & PRESSED),
    selected: isSelected,
  };
  return { props, state };
}

declare const gridState: unique symbol;
export type EmojiGridState = { readonly [gridState]: true };

export function useCell(grid: Cells, item: EmojiItem) {
  const overridden = useOverridden(item.unified, item.record);
  const picked = useStore(grid.picker, (s) => pickerFlags(s, item.id));
  const marked = useStore(grid.marks, (m) => markFlags(m, item.id));
  const flags = picked | marked;
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
  React.useLayoutEffect(() => {
    const el = element.current;
    if (!el || !focused) return;
    if (grid.virtual) moveVirtualFocus(el, grid.target());
    else if (el.ownerDocument.activeElement !== el) el.focus({ preventScroll: true });
  }, [focused, grid.virtual]);
  const { props, state } = cellProps(grid, item, flags, overridden);
  return { cellProps: { ...props, ref }, state };
}

export const useEmojiCell = useCell as unknown as (state: EmojiGridState, item: EmojiItem) => ReturnType<typeof useCell>;
