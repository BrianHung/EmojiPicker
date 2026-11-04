import * as React from "react";
import type { EmojiRecord } from "../core/dataset";
import { createSearch, type SearchState } from "../core/query";
import { emitter } from "../core/reactive";
import type { ShortcodeCompletion } from "../core/search-index";
import { findShortcodeTrigger } from "../core/shortcodes";
import { createEmojiSuggestions, type EmojiSuggestionsMachine, type KeyLike, type SuggestionsOptions, type SuggestionsSnapshot } from "../core/suggestions";
import { useEmojiContext, useStoreSnapshot } from "./provider";
import { useForcedColorsHighlight } from "./style-sheet";

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

export type AutocompleteResult = { value: string; caret: number };

export type { KeyLike };

export type EmojiSuggestionsOptions = Omit<SuggestionsOptions, "id" | "query"> & {
  /** What the user typed after the trigger (`:`), without it. Empty closes the list. */
  query: string;
};

export type EmojiSuggestions = SuggestionsSnapshot & {
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
 * Use it where something else finds the trigger, e.g. Tiptap's `@tiptap/suggestion` or a
 * ProseMirror plugin, and forward its key events.
 */
export function useEmojiSuggestions(options: EmojiSuggestionsOptions): EmojiSuggestions {
  const { store } = useEmojiContext();
  useEmojiStatus();
  useForcedColorsHighlight();
  const id = React.useId();
  const [machine] = React.useState(() => createEmojiSuggestions(store, { ...options, id }));
  machine.setOptions({ ...options, id });
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

export type ShortcodeAutocompleteOptions = Pick<EmojiSuggestionsOptions, "limit" | "matchBy" | "order" | "columns"> & {
  /** Current text and caret position of the input. */
  value: string;
  caret: number;
  /**
   * What a choice inserts: the emoji (iMessage) or the `:shortcode:` text
   * (Slack, rendered on send with `store.replaceShortcodes`). Custom emoji
   * always insert their shortcode. Default "emoji".
   */
  insert?: "emoji" | "shortcode";
  /** Called with the new text and caret when a suggestion is chosen. */
  onChoose?: (result: AutocompleteResult, suggestion: ShortcodeSuggestion) => void;
};

export type ShortcodeAutocomplete = Omit<EmojiSuggestions, "activeDescendant"> & {
  /** The new value and caret for a suggestion, without choosing it. */
  apply(suggestion: ShortcodeSuggestion): AutocompleteResult;
  /** ARIA combobox wiring for the text input. */
  getInputProps(): Record<string, string | boolean | undefined>;
};

/**
 * Headless `:tada` → 🎉 autocomplete for a textarea, input or editor: you
 * render the popup however you like; this owns matching, highlight,
 * keyboard handling and ARIA.
 */
export function useShortcodeAutocomplete({ value, caret, limit, insert = "emoji", columns, matchBy, order, onChoose }: ShortcodeAutocompleteOptions): ShortcodeAutocomplete {
  const match = findShortcodeTrigger(value.slice(0, caret));
  const typed = match?.query ?? "";
  const start = match?.offset ?? caret;
  // Called only after `core` exists (on choose, or by the caller).
  const apply = (suggestion: ShortcodeSuggestion): AutocompleteResult => {
    const text = `${core.textFor(suggestion, insert)} `;
    return { value: value.slice(0, start) + text + value.slice(caret), caret: start + text.length };
  };
  // The same shortcode typed at another position is a new query: key it by position too.
  const { activeDescendant, ...core } = useEmojiSuggestions({ query: typed, resetKey: `${start}:${typed}`, limit, matchBy, order, columns, onChoose: (s) => onChoose?.(apply(s), s) });
  return {
    ...core,
    apply,
    getInputProps: () => ({
      role: "combobox",
      "aria-autocomplete": "list",
      "aria-expanded": core.open,
      "aria-controls": core.open ? core.getListProps().id : undefined,
      "aria-activedescendant": activeDescendant,
    }),
  };
}
