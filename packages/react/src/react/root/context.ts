import * as React from "react";
import type { ChangeDetails, EmojiLabels, EmojiRecord, EmojiSelection, EmojiStore } from "@brianhung/emoji-picker-core";
import type { EmojiGridMove } from "../state/grid";
import type { HighlightChangeDetails, PickerState, SearchResultsMode } from "../state/picker";
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

export type SelectReason = "item-press" | "imperative-action";
export type ValueChangeDetails = ChangeDetails<SelectReason>;
export type ReactionsOpenChangeDetails = ChangeDetails<"trigger-press" | "item-press" | "escape-key" | "none">;

export type SelectDetails = ChangeDetails<SelectReason> & {
  collapse?: () => void;
};

export type Overlay = { record: EmojiRecord; style: React.CSSProperties; pick(unified: string, event?: Event): void; close(restore: boolean): void };

export type ListHandle = {
  move(to: EmojiGridMove, source?: HighlightSource, cell?: Element | null): boolean;
  pick(event?: Event, reason?: SelectReason): boolean;
  highlight(emoji: string | null, source?: HighlightSource): void;
  ids(): { list: string; active: string | undefined };
  clear(): boolean;
  focus(): boolean;
  jump(section: string, options?: { instant?: boolean; afterRender?: boolean }): void;
  atStart(): boolean;
  variations(target: Element | null): boolean;
  overlay(): Overlay | null;
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
  pick(unified: string, event?: Event, reason?: SelectReason): EmojiSelection | undefined;
  actions: EmojiPickerActions;
  ownsFocus(el: Element | null): boolean;
  target(): HTMLElement | null;
  skinTone: React.MutableRefObject<(() => void) | null>;
  list: React.MutableRefObject<ListHandle | null>;
  root: React.RefObject<HTMLElement | null>;
  searchInput: React.RefObject<HTMLInputElement | null>;
  listId: string;
  variations: { custom: boolean; register(): () => void };
};

export const PickerContext = React.createContext<PickerContextValue | null>(null);

export const ViewportContext = React.createContext<((orientation: Orientation) => void) | null>(null);

export function usePicker(part = "This part"): PickerContextValue {
  const value = React.useContext(PickerContext);
  if (!value) throw new Error(`${part} must be inside <EmojiPicker.Root>.`);
  return value;
}

export const useEmojiPickerActions = (): EmojiPickerActions => usePicker("useEmojiPickerActions").actions;
