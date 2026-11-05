import * as React from "react";
import type { Category, EmojiLabels, EmojiRecord, EmojiSection, EmojiSelection, EmojiStore, FocusModel, PickerState, SearchResultsMode } from "@brianhung/emoji-picker-core";
import type { CollapsedCategories } from "./collapse";
import type { KeyboardAction } from "./keymap";

export type PointerModel = "follows" | "independent";
export type { FocusModel, SearchResultsMode };

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
