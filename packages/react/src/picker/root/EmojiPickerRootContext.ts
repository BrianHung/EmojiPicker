"use client";

import * as React from "react";
import type { EmojiLabels, EmojiPickerStore, EmojiRecord, EmojiStore, HighlightChangeDetails, ReactionsOpenChangeDetails, SearchResultsMode, ValueChangeDetails } from "@emoji-components/core";
import type { EmojiGridMove } from "@emoji-components/core/grid";
import type { useDrawable } from "../../emoji/utils/useDrawable";

export type { HighlightChangeDetails, SearchResultsMode };

export type HighlightSource = { reason?: HighlightChangeDetails["reason"]; event?: Event };

export interface EmojiPickerRootActions {
  move(to: EmojiGridMove): boolean;
  pick(emoji?: string): boolean;
  highlight(emoji: string | null): void;
  focusSearch(): boolean;
  clearSearch(): void;
  toggleSkinTone(): boolean;
}

export type EmojiPickerRootChangeEventReason = ValueChangeDetails["reason"];
export type EmojiPickerRootChangeEventDetails = ValueChangeDetails;
export type EmojiPickerRootReactionsOpenChangeEventReason = ReactionsOpenChangeDetails["reason"];
export type EmojiPickerRootReactionsOpenChangeEventDetails = ReactionsOpenChangeDetails;

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
  columns?: number;
  searchResults: SearchResultsMode;
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
  // A Panel is mounted for Expand to open
  expandable: boolean;
  // The reaction buttons, for focus to land on when the row reopens
  items: Map<string, HTMLElement>;
  panel: React.RefObject<HTMLDivElement | null>;
  panelId: string;
  registerPanel(): () => void;
}

export const ReactionsContext = React.createContext<ReactionsContextValue | null>(null);
