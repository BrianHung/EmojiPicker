// Internal: what Root shares with its parts.
import * as React from "react";
import type { EmojiRecord } from "../core/dataset";
import type { EmojiLabels } from "../core/labels";
import type { EmojiSelection, EmojiStore } from "../core/store";
import type { CollapsedCategories } from "./collapse";
import type { PickerComponents } from "./components";
import type { KeyboardAction } from "./keymap";
import type { Category, EmojiSection } from "./sections";

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
export type SearchResultsMode = "ranked" | "grouped";

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
export const useSignal = <T,>(s: Signal<T>) => React.useSyncExternalStore(s.subscribe, s.get, s.get);

export type PickerContextValue = {
  store: EmojiStore;
  labels: EmojiLabels;
  focusModel: FocusModel;
  pointer: PointerModel;
  autoFocusSearch: boolean;
  disableVariations: boolean;
  components: PickerComponents;
  columns?: number;
  fitColumns: boolean;
  emojiVersion?: number;
  /** Sections in order with names and icons (all of them, empty or not). */
  categories: readonly Category[];
  /** The category list as shown now (collapse applied). */
  categorySections: readonly EmojiSection[];
  collapse: CollapsedCategories;
  query: string;
  setQuery(value: string): void;
  searching: boolean;
  searchResults: SearchResultsMode;
  searchLimit: number;
  results: readonly EmojiRecord[];
  pending: boolean;
  /** Pick an item or a unified code (skin tone already applied). */
  pick(unified: string, details?: SelectDetails): EmojiSelection | undefined;
  /** Close the surrounding popover; false when there's none. */
  close(): boolean;
  list: React.MutableRefObject<ListHandle | null>;
  /** The current section (category tabs), and the hovered or highlighted emoji. */
  activeSection: Signal<string | null>;
  activeEmoji: Signal<EmojiRecord | null>;
  /** A Search part is mounted (the List then uses virtual focus with focusModel "input"). */
  hasSearch: boolean;
  registerSearch(): () => void;
  /** Ids for aria-controls. */
  listId: string;
};

export const PickerContext = React.createContext<PickerContextValue | null>(null);

export function usePicker(part = "This part"): PickerContextValue {
  const value = React.useContext(PickerContext);
  if (!value) throw new Error(`${part} must be inside <EmojiPicker.Root>.`);
  return value;
}
