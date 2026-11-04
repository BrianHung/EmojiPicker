import { findShortcodeTrigger, isComposingKey } from "../core/shortcodes";
import * as React from "react";
import { unifiedToNative, type EmojiRecord } from "../core/dataset";
import type { ProgressiveHits } from "../core/search";
import type { CompletionOrder, ShortcodeCompletion } from "../core/search-index";
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

const NO_RESULTS: readonly EmojiRecord[] = [];

/**
 * Results of the provider's `search` for a query: the picker's results grid,
 * a command palette, a custom grid. Sync engines answer in the same render; an
 * async engine keeps showing the previous results until its promise settles,
 * and a newer query aborts the older request.
 */
export function useEmojiSearch(query: string, { limit = 50 }: { limit?: number } = {}): readonly EmojiRecord[] {
  return useEmojiSearchState(query, { limit }).results;
}

export type EmojiSearchState = {
  results: readonly EmojiRecord[];
  /** An async search for the current query is in flight. */
  pending: boolean;
};

/** `useEmojiSearch` plus whether an async engine is still working on the current query. */
export function useEmojiSearchState(query: string, { limit = 50 }: { limit?: number } = {}): EmojiSearchState {
  const { store } = useEmojiContext();
  const status = useEmojiStatus();
  const run = React.useMemo(() => {
    if (status !== "ready" || !query.trim()) return { results: NO_RESULTS };
    const controller = new AbortController();
    const out = store.query(query, { limit, signal: controller.signal });
    return Array.isArray(out) ? { results: out as readonly EmojiRecord[] } : { promise: out, controller };
  }, [status, store, query, limit]);
  const [settled, setSettled] = React.useState<{ run: unknown; results: readonly EmojiRecord[] }>({ run: null, results: NO_RESULTS });
  React.useEffect(() => {
    if (!("promise" in run) || !run.promise) return;
    let live = true;
    run.promise.then(
      (results) => live && setSettled({ run, results }),
      () => live && setSettled({ run, results: NO_RESULTS }),
    );
    return () => {
      live = false;
      run.controller.abort();
    };
  }, [run]);
  if ("results" in run && run.results) return { results: run.results, pending: false };
  if (settled.run === run) return { results: settled.results, pending: false };
  // Still working: interim results (a progressive search) if any, else the previous ones.
  const interim = "promise" in run ? (run.promise as Partial<ProgressiveHits<EmojiRecord[]>>).interim : undefined;
  return { results: interim ?? settled.results, pending: true };
}

export type ShortcodeSuggestion = ShortcodeCompletion;

export type AutocompleteResult = { value: string; caret: number };

/** The parts of a keyboard event the hooks read: a React event, a DOM event, or a ProseMirror/Tiptap `event`. */
export type KeyLike = { key: string; shiftKey?: boolean; isComposing?: boolean; keyCode?: number; preventDefault(): void };

export type EmojiSuggestionsOptions = {
  /** What the user typed after the trigger (`:`), without it. Empty closes the list. */
  query: string;
  limit?: number;
  /** "shortcode" (default) completes Slack shortcodes, highlighting the typed part; "search" uses the provider's `search` engine. */
  matchBy?: "shortcode" | "search";
  /** Shortcode matches only: "relevance" (default) or "alphabetical" (prefix matches A–Z, then the rest A–Z, as Discord lists them). */
  order?: CompletionOrder;
  /** Render the suggestions as a grid of this many columns: Left/Right move a cell, Up/Down a row (Grok, Discord-style grids). */
  columns?: number;
  /** Called when a suggestion is chosen (Enter, Tab, click). Already recorded as used. */
  onChoose?: (suggestion: ShortcodeSuggestion) => void;
  /** Called on Escape. */
  onDismiss?: () => void;
  /** Identity of the current query for resetting the highlight and re-opening after Escape. Default `query`. */
  resetKey?: string;
};

export type EmojiSuggestions = {
  open: boolean;
  query: string;
  suggestions: readonly ShortcodeSuggestion[];
  highlightedIndex: number;
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
  getOptionProps(index: number): {
    id: string;
    role: "option";
    "aria-selected": boolean;
    "data-highlighted": "" | undefined;
    onMouseDown: (event: React.MouseEvent) => void;
    onPointerMove: () => void;
  };
  /** id of the highlighted option, for `aria-activedescendant`. */
  activeDescendant: string | undefined;
};

/**
 * Headless emoji suggestions for a query you already extracted: the editor-agnostic
 * core of `useShortcodeAutocomplete`. Use it where something else finds the trigger,
 * e.g. Tiptap's `@tiptap/suggestion` or a ProseMirror plugin, and forward its key events.
 */
export function useEmojiSuggestions({ query, limit = 8, matchBy = "shortcode", order, columns, onChoose, onDismiss, resetKey = query }: EmojiSuggestionsOptions): EmojiSuggestions {
  const { store } = useEmojiContext();
  const status = useEmojiStatus();
  const id = React.useId();
  // "search" ranks with the provider's `search` (any engine, sync or async) instead of the shortcode index.
  const searched = useEmojiSearchState(matchBy === "search" ? query : "", { limit }).results;
  const suggestions = React.useMemo(
    () =>
      status !== "ready" || !query
        ? []
        : matchBy === "search"
          ? searched.map((record) => ({ record, shortcode: record.shortcodes[0] ?? record.name.replace(/\s+/g, "_"), match: null }))
          : store.completeShortcode(query, limit, order),
    [status, store, query, limit, matchBy, order, searched],
  );

  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const [dismissed, setDismissed] = React.useState<string | null>(null);
  // A new query resets the highlight and re-opens a dismissed list.
  React.useEffect(() => setHighlightedIndex(0), [resetKey]);
  const open = suggestions.length > 0 && dismissed !== resetKey;
  const highlighted = Math.min(highlightedIndex, Math.max(suggestions.length - 1, 0));

  const choose = (index = highlighted) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    store.frequents.record(suggestion.record.unified);
    onChoose?.(suggestion);
  };
  const dismiss = () => {
    setDismissed(resetKey);
    onDismiss?.();
  };
  const optionId = (index: number) => `${id}-option-${index}`;

  return {
    open,
    query,
    suggestions,
    highlightedIndex: highlighted,
    setHighlightedIndex,
    choose,
    dismiss,
    textFor: ({ record, shortcode }, insert = "emoji") => (record.imageUrl || insert === "shortcode" ? `:${shortcode}:` : unifiedToNative(store.withSkinTone(record.unified))),
    onKeyDown(event) {
      if (!open || isComposingKey(event)) return false;
      const n = suggestions.length;
      // A list wraps with Up/Down; a grid (`columns`) moves by a cell with Left/Right and by a row with Up/Down.
      const step = columns ? { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key] : { ArrowUp: -1, ArrowDown: 1 }[event.key];
      if (step) setHighlightedIndex(columns ? Math.max(0, Math.min(n - 1, highlighted + step)) : (highlighted + step + n) % n);
      else if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") choose();
      else if (event.key === "Escape") dismiss();
      else return false;
      event.preventDefault();
      return true;
    },
    getListProps: () => ({ id: `${id}-listbox`, role: "listbox" }),
    getOptionProps: (index) => ({
      id: optionId(index),
      role: "option",
      "aria-selected": index === highlighted,
      "data-highlighted": index === highlighted ? "" : undefined,
      // mousedown, not click: keep focus (and the caret) in the editor
      onMouseDown: (event) => {
        event.preventDefault();
        choose(index);
      },
      onPointerMove: () => setHighlightedIndex(index),
    }),
    activeDescendant: open ? optionId(highlighted) : undefined,
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
export function useShortcodeAutocomplete({ value, caret, limit = 8, insert = "emoji", columns, matchBy = "shortcode", order, onChoose }: ShortcodeAutocompleteOptions): ShortcodeAutocomplete {
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
