"use client";

import * as React from "react";
import type { ChangeDetails, EmojiLabels, EmojiPickerStore, EmojiRecord, EmojiSelection, EmojiStore, HighlightChangeDetails, SearchResultsMode } from "@emoji-components/core";
import type { EmojiGridMove } from "@emoji-components/core/grid";
import type { useDrawable } from "../../emoji/utils/useDrawable";
import type { EmojiPickerCollapsedCategories } from "./utils/useEmojiPickerCollapsedCategories";

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

export interface EmojiPickerRootContext {
  store: EmojiStore;
  state: EmojiPickerStore<React.ReactNode>;
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
  native: ReturnType<typeof useDrawable>;
}

export const EmojiPickerRootContext = React.createContext<EmojiPickerRootContext | null>(null);

export function useEmojiPickerRootContext(part = "This part"): EmojiPickerRootContext {
  const value = React.useContext(EmojiPickerRootContext);
  if (!value) throw new Error(`${part} must be inside <EmojiPicker.Root>.`);
  return value;
}

export interface ReactionsContextValue {
  reactions: readonly string[];
  open: boolean;
  // Opens the Panel and moves focus into it; absent while no Panel is mounted
  expand?: (event?: Event) => void;
  row: React.RefObject<HTMLDivElement | null>;
  panel: React.RefObject<HTMLDivElement | null>;
  panelId: string;
  registerPanel(): () => void;
}

export const ReactionsContext = React.createContext<ReactionsContextValue | null>(null);
