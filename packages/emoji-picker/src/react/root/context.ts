import * as React from "react";
import type { EmojiRecord } from "../../core/dataset";
import type { EmojiLabels } from "../../core/labels";
import type { PickerState, SearchResultsMode } from "../../core/picker";
import { same } from "../../core/reactive";
import type { Category, EmojiSection } from "../../core/sections";
import type { EmojiSelection, EmojiStore } from "../../core/store";
import type { CollapsedCategories } from "./collapse";
import type { KeyboardAction } from "./keymap";

export type FocusModel = "input" | "grid";
export type PointerModel = "follows" | "independent";
export type { SearchResultsMode };

export type SelectDetails = {
  collapse?: () => void;
};

export type ListHandle = {
  key(action: KeyboardAction, from: "input" | "list", event: KeyboardEvent | React.KeyboardEvent): boolean;
  clear(): boolean;
  focus(): boolean;
  jump(section: string, options?: { instant?: boolean }): void;
  atStart(): boolean;
  variations(target: Element): boolean;
};

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
  state: PickerState<React.ReactNode>;
  labels: EmojiLabels;
  focusModel: FocusModel;
  pointer: PointerModel;
  inPopover: boolean;
  disableVariations: boolean;
  columns?: number;
  fitColumns: boolean;
  emojiVersion?: number;
  categories: readonly Category<React.ReactNode>[];
  categorySections: readonly EmojiSection[];
  sections: readonly EmojiSection[];
  collapse: CollapsedCategories;
  query: string;
  setQuery(value: string): void;
  searching: boolean;
  searchResults: SearchResultsMode;
  searchLimit: number;
  results: readonly EmojiRecord[];
  pending: boolean;
  value: string | null | undefined;
  virtual: boolean;
  pick(unified: string, details?: SelectDetails): EmojiSelection | undefined;
  close(): boolean;
  list: React.MutableRefObject<ListHandle | null>;
  registerSearch(): () => void;
  listId: string;
};

export const PickerContext = React.createContext<PickerContextValue | null>(null);

export const ViewportContext = React.createContext<((orientation: "vertical" | "horizontal") => void) | null>(null);

export function usePicker(part = "This part"): PickerContextValue {
  const value = React.useContext(PickerContext);
  if (!value) throw new Error(`${part} must be inside <EmojiPicker.Root>.`);
  return value;
}
