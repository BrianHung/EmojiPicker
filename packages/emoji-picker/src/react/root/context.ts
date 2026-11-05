// Internal: what Root shares with its parts.
import * as React from "react";
import type { EmojiRecord } from "../../core/dataset";
import type { EmojiLabels } from "../../core/labels";
import type { PickerState, SearchResultsMode } from "../../core/picker";
import { same } from "../../core/reactive";
import type { Category, EmojiSection } from "../../core/sections";
import type { EmojiSelection, EmojiStore } from "../../core/store";
import type { CollapsedCategories } from "./collapse";
import type { KeyboardAction } from "./keymap";

/**
 * Where keyboard focus lives while navigating. "input": it stays in the search field
 * and a highlight moves through the grid (React Aria's Autocomplete: virtual focus
 * and aria-activedescendant, as Discord does). "grid": arrows move focus into the
 * cells (as Slack does).
 */
export type FocusModel = "input" | "grid";
/**
 * What hovering does to the keyboard position. "follows": the hovered emoji becomes
 * where arrows continue from and what Enter picks (Discord); with focus in the grid,
 * focus follows the pointer. "independent": hover is only a hover style (Linear, Slack).
 */
export type PointerModel = "follows" | "independent";
export type { SearchResultsMode };

export type SelectDetails = {
  /** Return a tapback to its compact row. */
  collapse?: () => void;
};

/** The mounted List, for the search field, the category tabs and Root's keys. */
export type ListHandle = {
  /** Moves the highlight (or focus) for a keymap action; false when the action doesn't apply. */
  key(action: KeyboardAction, from: "input" | "list", event: KeyboardEvent | React.KeyboardEvent): boolean;
  /** Drops the highlight (the field lost focus, or Escape). True when there was one. */
  clear(): boolean;
  /** Moves DOM focus to the grid's current cell (or the first in view). */
  focus(): boolean;
  /** Scrolls a section to the top (start); `instant` skips the smooth scroll. */
  jump(section: string, options?: { instant?: boolean }): void;
  /** The highlight is on the first emoji. */
  atStart(): boolean;
  /** Opens the skin-tone variations of the emoji at `target` (its cell, or the field's highlight). */
  variations(target: Element): boolean;
};

/** A tiny observable value: re-renders only its readers. */
export type Signal<T> = { get(): T; set(value: T): void; subscribe(listener: () => void): () => void };
export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export const useSignal = <T>(s: Signal<T>) => React.useSyncExternalStore(s.subscribe, s.get, s.get);

/** Part of a core store's snapshot; re-renders only when it changes (an object, shallowly). */
export function useSelector<S, T>(store: { subscribe(listener: () => void): () => void; getSnapshot(): S }, select: (snapshot: S) => T): T {
  const last = React.useRef<[S, T] | null>(null);
  const read = () => {
    const snapshot = store.getSnapshot();
    const prev = last.current;
    if (prev?.[0] !== snapshot) {
      const value = select(snapshot);
      last.current = [snapshot, prev && value && typeof value === "object" ? (same(prev[1] as object, value) as T) : value];
    }
    return last.current![1];
  };
  return React.useSyncExternalStore(store.subscribe, read, read);
}

export type PickerContextValue = {
  store: EmojiStore;
  /** The picker's core state: query, sections, collapse, highlight, hover, current section. */
  state: PickerState<React.ReactNode>;
  labels: EmojiLabels;
  focusModel: FocusModel;
  pointer: PointerModel;
  /** Inside an EmojiPopover, which focuses the search field once it shows. */
  inPopover: boolean;
  disableVariations: boolean;
  columns?: number;
  fitColumns: boolean;
  emojiVersion?: number;
  /** Sections in order with names and icons (all of them, empty or not). */
  categories: readonly Category<React.ReactNode>[];
  /** The category list as shown now (collapse applied). */
  categorySections: readonly EmojiSection[];
  /** What the grid shows: search results while searching, else `categorySections`. */
  sections: readonly EmojiSection[];
  collapse: CollapsedCategories;
  query: string;
  setQuery(value: string): void;
  searching: boolean;
  searchResults: SearchResultsMode;
  searchLimit: number;
  results: readonly EmojiRecord[];
  pending: boolean;
  /** Root's `value`: the emoji shown as chosen; undefined when the picker has none. */
  value: string | null | undefined;
  /** The highlight is virtual (focus stays in the search field), else focus roves the cells. */
  virtual: boolean;
  /** Pick an item or a unified code (skin tone already applied). */
  pick(unified: string, details?: SelectDetails): EmojiSelection | undefined;
  /** Close the surrounding popover; false when there's none. */
  close(): boolean;
  list: React.MutableRefObject<ListHandle | null>;
  registerSearch(): () => void;
  /** Ids for aria-controls. */
  listId: string;
};

export const PickerContext = React.createContext<PickerContextValue | null>(null);

/** The List tells its Viewport which axis scrolls. */
export const ViewportContext = React.createContext<((orientation: "vertical" | "horizontal") => void) | null>(null);

export function usePicker(part = "This part"): PickerContextValue {
  const value = React.useContext(PickerContext);
  if (!value) throw new Error(`${part} must be inside <EmojiPicker.Root>.`);
  return value;
}
