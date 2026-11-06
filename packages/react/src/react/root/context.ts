import * as React from "react";
import type { ChangeDetails, EmojiGridMove, EmojiLabels, EmojiSelection, EmojiStore, HighlightChangeDetails, PickerState, SearchResultsMode } from "@brianhung/emoji-picker-core";
import type { CollapsedCategories } from "./collapse";
import type { Orientation } from "../utils/render";

export type { HighlightChangeDetails, SearchResultsMode };

export type HighlightSource = { reason?: HighlightChangeDetails["reason"]; event?: Event };

export type EmojiPickerActions = {
  move(to: EmojiGridMove): boolean;
  pick(): boolean;
  highlight(emoji: string | null): void;
  focusSearch(): boolean;
  clearSearch(): void;
  close(): boolean;
  toggleSkinTone(): boolean;
};

export type ValueChangeDetails = ChangeDetails<"item-press">;
export type ReactionsOpenChangeDetails = ChangeDetails<"trigger-press" | "item-press" | "none">;

export type SelectDetails = {
  collapse?: () => void;
};

export type ListHandle = {
  move(to: EmojiGridMove, source?: HighlightSource, cell?: Element | null): boolean;
  pick(): boolean;
  highlight(emoji: string | null, source?: HighlightSource): void;
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
  columns?: number;
  collapse: CollapsedCategories;
  searchResults: SearchResultsMode;
  value: string | null | undefined;
  pick(unified: string, details?: SelectDetails): EmojiSelection | undefined;
  actions: EmojiPickerActions;
  ownsFocus(el: Element | null): boolean;
  target(): HTMLElement | null;
  skinTone: React.MutableRefObject<(() => void) | null>;
  list: React.MutableRefObject<ListHandle | null>;
  root: React.RefObject<HTMLElement | null>;
  searchInput: React.RefObject<HTMLInputElement | null>;
  listId: string;
};

export const PickerContext = React.createContext<PickerContextValue | null>(null);

export const ViewportContext = React.createContext<((orientation: Orientation) => void) | null>(null);

export function usePicker(part = "This part"): PickerContextValue {
  const value = React.useContext(PickerContext);
  if (!value) throw new Error(`${part} must be inside <EmojiPicker.Root>.`);
  return value;
}

export const useEmojiPickerActions = (): EmojiPickerActions => usePicker("useEmojiPickerActions").actions;
