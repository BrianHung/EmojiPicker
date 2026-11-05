import * as React from "react";
import type { Category, EmojiGridMove, EmojiLabels, EmojiRecord, EmojiSection, EmojiSelection, EmojiStore, HighlightChangeDetails, PickerState, SearchResultsMode } from "@brianhung/emoji-picker-core";
import type { CollapsedCategories } from "./collapse";

export type { HighlightChangeDetails, SearchResultsMode };

export type EmojiPickerActions = {
  move(to: EmojiGridMove): boolean;
  pick(): boolean;
  highlight(emoji: string | null): void;
  focusSearch(): boolean;
  clearSearch(): void;
  close(): boolean;
  toggleSkinTone(): boolean;
};

export type SelectDetails = {
  collapse?: () => void;
};

export type ListHandle = {
  move(to: EmojiGridMove, details?: HighlightChangeDetails, cell?: Element | null): boolean;
  pick(): boolean;
  highlight(emoji: string | null): void;
  ids(): { list: string; active: string | undefined };
  clear(): boolean;
  focus(): boolean;
  jump(section: string, options?: { instant?: boolean; afterRender?: boolean }): void;
  atStart(): boolean;
  variations(target: Element | null): boolean;
};

export type PickerContextValue = {
  store: EmojiStore;
  state: PickerState<React.ReactNode>;
  labels: EmojiLabels;
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
  actions: EmojiPickerActions;
  ownsFocus(el: Element | null): boolean;
  target(): HTMLElement | null;
  skinTone: React.MutableRefObject<(() => void) | null>;
  list: React.MutableRefObject<ListHandle | null>;
  root: React.RefObject<HTMLElement | null>;
  searchInput: React.RefObject<HTMLInputElement | null>;
  registerInput(): () => void;
  listId: string;
};

export const PickerContext = React.createContext<PickerContextValue | null>(null);

export const ViewportContext = React.createContext<((orientation: "vertical" | "horizontal") => void) | null>(null);

export function usePicker(part = "This part"): PickerContextValue {
  const value = React.useContext(PickerContext);
  if (!value) throw new Error(`${part} must be inside <EmojiPicker.Root>.`);
  return value;
}

export const useEmojiPickerActions = (): EmojiPickerActions => usePicker("useEmojiPickerActions").actions;
