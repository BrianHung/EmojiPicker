import { unifiedToNative, type EmojiRecord } from "./dataset";
import { KEY_MOVES } from "./keys";
import { createStore, memo, shallowEqual, stable, subscribeAll, type Subscribe } from "./reactive";
import { createSearch } from "./search/query";
import type { CompletionOrder, ShortcodeCompletion } from "./search/search-index";
import { isComposingKey } from "./shortcodes";
import type { EmojiSelection, EmojiStore } from "./store";
import { syncAriaAttributes } from "./sync-attributes";

export interface KeyLike {
  key: string;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  preventDefault(): void;
}

export interface EmojiSuggestionsOptions {
  query?: string;
  resetKey?: string;
  id?: string;
  limit?: number;
  matchBy?: "shortcode" | "search";
  order?: CompletionOrder;
  columns?: number;
  onChoose?: (suggestion: ShortcodeCompletion) => void;
  onSelect?: (selection: EmojiSelection) => void;
  onDismiss?: () => void;
}

export interface EmojiSuggestionsSnapshot {
  query: string;
  open: boolean;
  suggestions: readonly ShortcodeCompletion[];
  highlightedIndex: number;
  activeDescendant: string | undefined;
}

export type SuggestionsMove = "up" | "down" | "left" | "right";

export interface EmojiTrigger {
  query: string;
  anchor: () => DOMRect | null;
  replace: (text: string, suggestion: ShortcodeCompletion) => void;
}

export type SuggestionsInputProps = {
  role: "combobox";
  "aria-autocomplete": "list";
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  "aria-activedescendant": string | undefined;
};

export type SuggestionsListProps = {
  id: string;
  role: "listbox";
};

export type SuggestionsOptionProps = {
  id: string;
  role: "option";
  "aria-selected": boolean;
  "data-highlighted": "" | undefined;
};

export interface EmojiSuggestionsStore {
  getSnapshot(): EmojiSuggestionsSnapshot;
  subscribe: Subscribe;
  setOptions(options: EmojiSuggestionsOptions): void;
  setQuery(query: string, resetKey?: string): void;
  highlight(index: number): void;
  move(direction: SuggestionsMove): boolean;
  choose(index?: number): void;
  // For a selection another UI made and already recorded, such as a picker in the menu
  insert(selection: EmojiSelection): void;
  dismiss(): void;
  keydown(event: KeyLike): boolean;
  textFor(suggestion: ShortcodeCompletion, insert?: "emoji" | "shortcode"): string;
  getListProps(): SuggestionsListProps;
  getOptionProps(index: number): SuggestionsOptionProps;
  getInputProps(): SuggestionsInputProps;
  // For an editor element the app doesn't render: writes getInputProps() while open and restores the element after
  syncCombobox(el: Element): () => void;
}

const NONE: readonly ShortcodeCompletion[] = [];
const DEFAULT_LIMIT = 8;

type Input = { options: EmojiSuggestionsOptions; resetKey: string; generation: number };
type Ui = { highlight: { index: number; generation: number }; dismissed: string | null };
type UiAction = { type: "highlight"; index: number; generation: number } | { type: "dismiss"; key: string };

const resetKeyOf = (options: EmojiSuggestionsOptions) => options.resetKey ?? options.query ?? "";

const reduceInput = (input: Input, options: EmojiSuggestionsOptions): Input => {
  const resetKey = resetKeyOf(options);
  if (resetKey !== input.resetKey) return { options, resetKey, generation: input.generation + 1 };
  return shallowEqual(input.options, options) ? input : { ...input, options };
};

const reduceUi = (ui: Ui, action: UiAction): Ui => {
  switch (action.type) {
    case "highlight":
      return { ...ui, highlight: { index: action.index, generation: action.generation } };
    case "dismiss":
      return ui.dismissed === action.key ? ui : { ...ui, dismissed: action.key };
    default:
      return action satisfies never;
  }
};

const completionOf = (record: EmojiRecord): ShortcodeCompletion => ({ record, shortcode: record.shortcodes[0] ?? record.name.replace(/\s+/g, "_"), match: null });

const highlightOf = (input: Input, ui: Ui) => (ui.highlight.generation === input.generation ? ui.highlight.index : 0);

export function createEmojiSuggestions(store: EmojiStore, options: EmojiSuggestionsOptions = {}): EmojiSuggestionsStore {
  const input = createStore<Input, EmojiSuggestionsOptions>({ options, resetKey: resetKeyOf(options), generation: 0 }, reduceInput);
  const ui = createStore<Ui, UiAction>({ highlight: { index: 0, generation: 0 }, dismissed: null }, reduceUi);
  const searchOf = ({ query = "", limit = DEFAULT_LIMIT, matchBy }: EmojiSuggestionsOptions) => ({ query: matchBy === "search" ? query : "", limit });
  const search = createSearch(store, searchOf(options));
  const opts = () => input.getSnapshot().options;
  const id = (suffix: string) => `${opts().id ?? "emoji-suggestions"}-${suffix}`;
  const update = (next: EmojiSuggestionsOptions) => {
    const { query, limit } = searchOf(next);
    search.setQuery(query, limit);
    input.dispatch(next);
  };
  const suggestionsOf = memo((status: string, q: string, n: number, matchBy: string | undefined, order: CompletionOrder | undefined, searched: readonly EmojiRecord[]) =>
    status !== "ready" || !q ? NONE : matchBy === "search" ? searched.map(completionOf) : store.completeShortcode(q, n, order),
  );
  const keep = stable<EmojiSuggestionsSnapshot>();
  const getSnapshot = memo((current: Input, state: Ui, status: string, searched: readonly EmojiRecord[]): EmojiSuggestionsSnapshot => {
    const { query: q = "", limit = DEFAULT_LIMIT, matchBy, order } = current.options;
    const suggestions = suggestionsOf(status, q, limit, matchBy, order, searched);
    const index = Math.min(highlightOf(current, state), Math.max(suggestions.length - 1, 0));
    const open = suggestions.length > 0 && state.dismissed !== current.resetKey;
    return keep({ query: q, open, suggestions, highlightedIndex: index, activeDescendant: open ? id(`option-${index}`) : undefined });
  });
  const snapshot = () => getSnapshot(input.getSnapshot(), ui.getSnapshot(), store.status(), search.getSnapshot().results);

  const highlight = (index: number) => {
    const current = input.getSnapshot();
    if (index === highlightOf(current, ui.getSnapshot())) return;
    ui.dispatch({ type: "highlight", index, generation: current.generation });
  };

  const self: EmojiSuggestionsStore = {
    getSnapshot: snapshot,
    subscribe: subscribeAll(input.subscribe, ui.subscribe, store.subscribe, search.subscribe),
    setOptions: update,
    setQuery: (q, key = q) => update({ ...opts(), query: q, resetKey: key }),
    highlight,
    move(direction) {
      const { open, suggestions, highlightedIndex: i } = snapshot();
      const n = suggestions.length;
      const columns = opts().columns;
      const step = columns ? { left: -1, right: 1, up: -columns, down: columns }[direction] : { up: -1, down: 1, left: 0, right: 0 }[direction];
      if (!open || !step) return false;
      highlight(columns ? Math.max(0, Math.min(n - 1, i + step)) : (i + step + n) % n);
      return true;
    },
    choose(index = snapshot().highlightedIndex) {
      const suggestion = snapshot().suggestions[index];
      if (!suggestion) return;
      const selection = store.select(store.withSkinTone(suggestion.record.unified));
      opts().onChoose?.(suggestion);
      if (selection) opts().onSelect?.(selection);
    },
    insert(selection) {
      const record = store.get(selection.baseUnified);
      if (!record) return;
      opts().onChoose?.(completionOf(record));
      opts().onSelect?.(selection);
    },
    dismiss() {
      ui.dispatch({ type: "dismiss", key: input.getSnapshot().resetKey });
      opts().onDismiss?.();
    },
    keydown(event) {
      if (!snapshot().open || isComposingKey(event)) return false;
      const move = KEY_MOVES[event.key];
      const direction = move === "up" || move === "down" || move === "left" || move === "right" ? move : undefined;
      if (direction) {
        if (!self.move(direction)) return false;
      } else if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") self.choose();
      else if (event.key === "Escape") self.dismiss();
      else return false;
      event.preventDefault();
      return true;
    },
    textFor: ({ record, shortcode }, insert = "emoji") => (record.imageUrl || insert === "shortcode" ? `:${shortcode}:` : unifiedToNative(store.withSkinTone(record.unified))),
    getListProps: () => ({ id: id("listbox"), role: "listbox" }),
    getOptionProps(index) {
      const selected = index === snapshot().highlightedIndex;
      return { id: id(`option-${index}`), role: "option", "aria-selected": selected, "data-highlighted": selected ? "" : undefined };
    },
    getInputProps() {
      const { open, activeDescendant } = snapshot();
      return { role: "combobox", "aria-autocomplete": "list", "aria-expanded": open, "aria-controls": open ? id("listbox") : undefined, "aria-activedescendant": activeDescendant };
    },
    syncCombobox: (el) => syncAriaAttributes(el, () => (snapshot().open ? self.getInputProps() : null), self.subscribe),
  };
  return self;
}
