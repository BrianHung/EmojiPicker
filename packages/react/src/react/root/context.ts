import * as React from "react";
import type { ChangeDetails, EmojiLabels, EmojiPicker, EmojiRecord, EmojiSelection, EmojiStore, HighlightChangeDetails, SearchResultsMode } from "@brianhung/emoji-picker-core";
import type { EmojiGridMove } from "@brianhung/emoji-picker-core/grid";
import type { EmojiPickerCollapsedCategories } from "./collapse";
import type { EmojiPickerOrientation } from "../utils/render";

export type { HighlightChangeDetails, SearchResultsMode };

export type HighlightSource = { reason?: HighlightChangeDetails["reason"]; event?: Event };

export interface EmojiPickerRootActions {
  move(to: EmojiGridMove): boolean;
  pick(): boolean;
  highlight(emoji: string | null): void;
  focusSearch(): boolean;
  clearSearch(): void;
  close(): boolean;
  toggleSkinTone(): boolean;
}

export type EmojiPickerRootChangeEventReason = "item-press" | "imperative-action";
export type EmojiPickerRootChangeEventDetails = ChangeDetails<EmojiPickerRootChangeEventReason>;
export type EmojiPickerRootReactionsOpenChangeEventReason = "trigger-press" | "item-press" | "escape-key" | "none";
export type EmojiPickerRootReactionsOpenChangeEventDetails = ChangeDetails<EmojiPickerRootReactionsOpenChangeEventReason>;

export type EmojiPickerRootSelectEventReason = EmojiPickerRootChangeEventReason;
export type EmojiPickerRootSelectEventDetails = ChangeDetails<EmojiPickerRootSelectEventReason> & {
  collapse?: () => void;
};

export interface Overlay {
  record: EmojiRecord;
  style: React.CSSProperties;
  pick(unified: string, event?: Event): void;
  close(restore: boolean): void;
}

export interface ListHandle {
  move(to: EmojiGridMove, source?: HighlightSource, cell?: Element | null): boolean;
  pick(event?: Event, reason?: EmojiPickerRootChangeEventReason): boolean;
  highlight(emoji: string | null, source?: HighlightSource): void;
  ids(): { list: string; active: string | undefined };
  clear(): boolean;
  focus(): boolean;
  jump(section: string, options?: { instant?: boolean; afterRender?: boolean }): void;
  atStart(): boolean;
  variations(target: Element | null): boolean;
  overlay(): Overlay | null;
}

export interface PickerContextValue {
  store: EmojiStore;
  state: EmojiPicker<React.ReactNode>;
  labels: EmojiLabels;
  inPopover: boolean;
  columns?: number;
  collapse: EmojiPickerCollapsedCategories;
  searchResults: SearchResultsMode;
  // undefined while the Root doesn't track a value
  value: string | null | undefined;
  pick(unified: string, event?: Event, reason?: EmojiPickerRootChangeEventReason): EmojiSelection | undefined;
  actions: EmojiPickerRootActions;
  ownsFocus(el: Element | null): boolean;
  target(): HTMLElement | null;
  skinTone: React.MutableRefObject<(() => void) | null>;
  list: React.MutableRefObject<ListHandle | null>;
  root: React.RefObject<HTMLElement | null>;
  searchInput: React.RefObject<HTMLInputElement | null>;
  listId: string;
  variations: { custom: boolean; register(): () => void };
  registerStatus(): () => void;
}

export const PickerContext = React.createContext<PickerContextValue | null>(null);

export const ViewportContext = React.createContext<((orientation: EmojiPickerOrientation) => void) | null>(null);

export function usePicker(part = "This part"): PickerContextValue {
  const value = React.useContext(PickerContext);
  if (!value) throw new Error(`${part} must be inside <EmojiPicker.Root>.`);
  return value;
}

export const useEmojiPickerActions = (): EmojiPickerRootActions => usePicker("useEmojiPickerActions").actions;
