import * as React from "react";
import type { EmojiRecord } from "../core/dataset";
import { createSearch, type SearchState } from "../core/query";
import { emitter } from "../core/reactive";
import type { ShortcodeCompletion } from "../core/search-index";
import { createEmojiSuggestions, type EmojiSuggestionsMachine, type KeyLike, type SuggestionsOptions, type SuggestionsSnapshot } from "../core/suggestions";
import { useEmojiContext, useStoreSnapshot } from "./provider";

/** Top `n` emoji (base unified codes) by decayed frequency, filled with defaults. */
export function useFrequentEmoji(n = 5): readonly string[] {
  const { store } = useEmojiContext();
  return React.useSyncExternalStore(
    store.frequents.subscribe,
    () => store.frequents.top(n),
    () => store.frequents.top(n),
  );
}

/** Shared skin tone, 0 (none) to 5. Persisted, and applied by every picker. */
export function useSkinTone(): [tone: number, setTone: (tone: number) => void] {
  const { store } = useEmojiContext();
  return [useStoreSnapshot((s) => s.skinTone()), store.setSkinTone];
}

/** Loading state of the shared dataset; triggers the load on first use. */
export function useEmojiStatus() {
  const { store } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  React.useEffect(() => {
    if (status === "idle") store.load().catch(() => {});
  }, [status, store]);
  return status;
}

/**
 * Results of the provider's `search` for a query: the picker's results grid,
 * a command palette, a custom grid. Sync engines answer in the same render; an
 * async engine keeps showing the previous results until its promise settles,
 * and a newer query aborts the older request.
 */
export function useEmojiSearch(query: string, { limit = 50 }: { limit?: number } = {}): readonly EmojiRecord[] {
  return useEmojiSearchState(query, { limit }).results;
}

export type EmojiSearchState = SearchState;

/** `useEmojiSearch` plus whether an async engine is still working on the current query. */
export function useEmojiSearchState(query: string, { limit = 50 }: { limit?: number } = {}): EmojiSearchState {
  const { store } = useEmojiContext();
  useEmojiStatus();
  const [search] = React.useState(() => {
    const events = emitter(() => () => runner.abort());
    const runner = createSearch(store, events.emit);
    return { runner, subscribe: events.subscribe };
  });
  const read = () => search.runner.run(query, limit);
  return React.useSyncExternalStore(search.subscribe, read, read);
}

export type ShortcodeSuggestion = ShortcodeCompletion;


export type { KeyLike };

export type EmojiSuggestionsOptions = Omit<SuggestionsOptions, "id" | "query"> & {
  /** What the user typed after the trigger (`:`), without it. Empty closes the list. */
  query: string;
};

export type EmojiSuggestionsState = SuggestionsSnapshot & {
  setHighlightedIndex: (index: number) => void;
  /** Choose a suggestion (the highlighted one by default): records it as used and calls onChoose. */
  choose(index?: number): void;
  /** Close until the query changes. */
  dismiss(): void;
  /** The text a suggestion inserts: the emoji in the user's skin tone, or `:shortcode:` (always for custom emoji). */
  textFor(suggestion: ShortcodeSuggestion, insert?: "emoji" | "shortcode"): string;
  /** Arrow keys, Enter/Tab and Escape. Returns true when it handled (and prevented) the key. */
  onKeyDown(event: KeyLike): boolean;
  getListProps(): { id: string; role: "listbox" };
  getOptionProps(index: number): ReturnType<EmojiSuggestionsMachine["getOptionProps"]> & {
    onMouseDown: (event: React.MouseEvent) => void;
    onPointerMove: () => void;
  };
};

/**
 * Headless emoji suggestions for a query you already extracted (core's `createEmojiSuggestions`).
 * Use it where something else finds the trigger and forwards its key events.
 */
export function useEmojiSuggestions(options: EmojiSuggestionsOptions): EmojiSuggestionsState {
  const { store } = useEmojiContext();
  const id = React.useId();
  const [machine] = React.useState(() => createEmojiSuggestions(store, { ...options, id }));
  machine.setOptions({ ...options, id });
  return useSuggestionsStore(machine);
}

/** React state of a suggestions store made elsewhere: an editor plugin's (`emojiTypeahead`). */
export function useSuggestionsStore(machine: EmojiSuggestionsMachine): EmojiSuggestionsState {
  useEmojiStatus();
  const snapshot = React.useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);
  return {
    ...snapshot,
    setHighlightedIndex: machine.highlight,
    choose: machine.choose,
    dismiss: machine.dismiss,
    textFor: machine.textFor,
    onKeyDown: machine.keydown,
    getListProps: machine.getListProps,
    getOptionProps: (index) => ({
      ...machine.getOptionProps(index),
      // mousedown, not click: keep focus (and the caret) in the editor
      onMouseDown: (event) => {
        event.preventDefault();
        machine.choose(index);
      },
      onPointerMove: () => machine.highlight(index),
    }),
  };
}

