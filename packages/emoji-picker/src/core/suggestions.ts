import { unifiedToNative, type EmojiRecord } from "./dataset";
import { createSearch } from "./search/query";
import { emitter, memo, same } from "./reactive";
import type { CompletionOrder, ShortcodeCompletion } from "./search/search-index";
import { isComposingKey } from "./shortcodes";
import type { EmojiStore } from "./store";

/** The parts of a keyboard event the typeahead reads: a DOM event, a framework's, or ProseMirror's. */
export type KeyLike = { key: string; shiftKey?: boolean; isComposing?: boolean; keyCode?: number; preventDefault(): void };

export type SuggestionsOptions = {
  /** What the user typed after the trigger (`:`), without it. Empty closes the list. */
  query?: string;
  /** Identity of the query for resetting the highlight and re-opening after a dismiss. Default `query`. */
  resetKey?: string;
  /** Prefix of the list's and options' ids. */
  id?: string;
  limit?: number;
  /** "shortcode" (default) completes Slack shortcodes; "search" uses the store's `search` engine. */
  matchBy?: "shortcode" | "search";
  /** Shortcode matches only: "relevance" (default) or "alphabetical". */
  order?: CompletionOrder;
  /** A grid of this many columns: Left/Right move a cell, Up/Down a row. Default: a list. */
  columns?: number;
  /** A suggestion was chosen; already recorded as used. */
  onChoose?: (suggestion: ShortcodeCompletion) => void;
  onDismiss?: () => void;
};

export type SuggestionsSnapshot = {
  query: string;
  open: boolean;
  suggestions: readonly ShortcodeCompletion[];
  highlightedIndex: number;
  /** id of the highlighted option, for `aria-activedescendant`. */
  activeDescendant: string | undefined;
};

export type SuggestionsMove = "up" | "down" | "left" | "right";

const NONE: readonly ShortcodeCompletion[] = [];
const KEYS: Record<string, SuggestionsMove> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

/**
 * The `:shortcode` typeahead as a store: matching, a highlight, keys and ARIA attributes, for any
 * framework. Feed it the query (`setQuery`, or `setOptions` from a render) and render its snapshot.
 */
export function createEmojiSuggestions(store: EmojiStore, options: SuggestionsOptions = {}) {
  let opts = options;
  let highlighted = 0;
  let resetKey = options.resetKey ?? options.query ?? "";
  let dismissed: string | null = null;
  let cached: SuggestionsSnapshot | null = null;
  let last: SuggestionsSnapshot | null = null;
  const changed = () => {
    cached = null;
    events.emit();
  };
  const events = emitter(() => {
    cached = null;
    const off = store.subscribe(changed);
    return () => {
      off();
      search.abort();
    };
  });
  const search = createSearch(store, changed);
  const query = () => opts.query ?? "";
  const limit = () => opts.limit ?? 8;
  const id = (suffix: string) => `${opts.id ?? "emoji-suggestions"}-${suffix}`;
  const suggestionsOf = memo((status: string, q: string, n: number, matchBy: string | undefined, order: CompletionOrder | undefined, searched: readonly EmojiRecord[]) =>
    status !== "ready" || !q
      ? NONE
      : matchBy === "search"
        ? searched.map((record) => ({ record, shortcode: record.shortcodes[0] ?? record.name.replace(/\s+/g, "_"), match: null }))
        : store.completeShortcode(q, n, order),
  );

  function getSnapshot(): SuggestionsSnapshot {
    if (cached) return cached;
    const q = query();
    const { results } = search.run(opts.matchBy === "search" ? q : "", limit());
    const suggestions = suggestionsOf(store.status(), q, limit(), opts.matchBy, opts.order, results);
    const index = Math.min(highlighted, Math.max(suggestions.length - 1, 0));
    const open = suggestions.length > 0 && dismissed !== resetKey;
    return (cached = last = same(last, { query: q, open, suggestions, highlightedIndex: index, activeDescendant: open ? id(`option-${index}`) : undefined }));
  }

  /** Takes new options without notifying: for a framework syncing them from a render. */
  function setOptions(next: SuggestionsOptions) {
    const key = next.resetKey ?? next.query ?? "";
    if (key !== resetKey) highlighted = 0;
    resetKey = key;
    opts = next;
    cached = null;
  }

  const highlight = (index: number) => {
    if (index === highlighted) return;
    highlighted = index;
    changed();
  };

  const machine = {
    getSnapshot,
    subscribe: events.subscribe,
    setOptions,
    setQuery(q: string, key = q) {
      setOptions({ ...opts, query: q, resetKey: key });
      changed();
    },
    highlight,
    /** Moves the highlight; a list wraps on Up/Down, a grid (`columns`) clamps. False when the move doesn't apply. */
    move(direction: SuggestionsMove): boolean {
      const { open, suggestions, highlightedIndex: i } = getSnapshot();
      const n = suggestions.length;
      const columns = opts.columns;
      const step = columns ? { left: -1, right: 1, up: -columns, down: columns }[direction] : { up: -1, down: 1, left: 0, right: 0 }[direction];
      if (!open || !step) return false;
      highlight(columns ? Math.max(0, Math.min(n - 1, i + step)) : (i + step + n) % n);
      return true;
    },
    /** Chooses a suggestion (the highlighted one by default): records it as used and calls onChoose. */
    choose(index = getSnapshot().highlightedIndex) {
      const suggestion = getSnapshot().suggestions[index];
      if (!suggestion) return;
      store.frequents.record(suggestion.record.unified);
      opts.onChoose?.(suggestion);
    },
    /** Closes until the query changes. */
    dismiss() {
      dismissed = resetKey;
      changed();
      opts.onDismiss?.();
    },
    /** Arrows, Enter/Tab and Escape, never while an IME composes. True when it handled (and prevented) the key. */
    keydown(event: KeyLike): boolean {
      if (!getSnapshot().open || isComposingKey(event)) return false;
      const direction = KEYS[event.key];
      if (direction) {
        if (!machine.move(direction)) return false;
      } else if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") machine.choose();
      else if (event.key === "Escape") machine.dismiss();
      else return false;
      event.preventDefault();
      return true;
    },
    /** What a suggestion inserts: the emoji in the user's skin tone, or `:shortcode:` (always for custom emoji). */
    textFor: ({ record, shortcode }: ShortcodeCompletion, insert: "emoji" | "shortcode" = "emoji") =>
      record.imageUrl || insert === "shortcode" ? `:${shortcode}:` : unifiedToNative(store.withSkinTone(record.unified)),
    getListProps: () => ({ id: id("listbox"), role: "listbox" as const }),
    getOptionProps(index: number) {
      const selected = index === getSnapshot().highlightedIndex;
      return { id: id(`option-${index}`), role: "option" as const, "aria-selected": selected, "data-highlighted": selected ? ("" as const) : undefined };
    },
    /** Combobox attributes for the text field the user types in. */
    getInputProps() {
      const { open, activeDescendant } = getSnapshot();
      return { role: "combobox" as const, "aria-autocomplete": "list" as const, "aria-expanded": open, "aria-controls": open ? id("listbox") : undefined, "aria-activedescendant": activeDescendant };
    },
  };
  return machine;
}

export type EmojiSuggestionsMachine = ReturnType<typeof createEmojiSuggestions>;
