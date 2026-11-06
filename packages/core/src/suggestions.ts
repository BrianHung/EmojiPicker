import { unifiedToNative, type EmojiRecord } from "./dataset";
import { createStore, memo, stable, subscribeAll } from "./reactive";
import { createSearch } from "./search/query";
import type { CompletionOrder, ShortcodeCompletion } from "./search/search-index";
import { isComposingKey } from "./shortcodes";
import type { EmojiSelection, EmojiStore } from "./store";

export type KeyLike = { key: string; shiftKey?: boolean; isComposing?: boolean; keyCode?: number; preventDefault(): void };

export type SuggestionsOptions = {
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
};

export type SuggestionsSnapshot = {
  query: string;
  open: boolean;
  suggestions: readonly ShortcodeCompletion[];
  highlightedIndex: number;
  activeDescendant: string | undefined;
};

export type SuggestionsMove = "up" | "down" | "left" | "right";

export type EmojiTrigger = {
  query: string;
  anchor: () => DOMRect | null;
  replace: (text: string, suggestion: ShortcodeCompletion) => void;
};

const NONE: readonly ShortcodeCompletion[] = [];
const KEYS: Record<string, SuggestionsMove> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

type Input = { options: SuggestionsOptions; resetKey: string; generation: number };
type Ui = { highlight: { index: number; generation: number }; dismissed: string | null };
type UiAction = { type: "highlight"; index: number; generation: number } | { type: "dismiss"; key: string } | { type: "refresh" };

const resetKeyOf = (options: SuggestionsOptions) => options.resetKey ?? options.query ?? "";

const reduceInput = (input: Input, options: SuggestionsOptions): Input => {
  const resetKey = resetKeyOf(options);
  return resetKey === input.resetKey ? { ...input, options } : { options, resetKey, generation: input.generation + 1 };
};

const reduceUi = (ui: Ui, action: UiAction): Ui => {
  switch (action.type) {
    case "highlight":
      return { ...ui, highlight: { index: action.index, generation: action.generation } };
    case "dismiss":
      return { ...ui, dismissed: action.key };
    case "refresh":
      return { ...ui };
  }
};

const completionOf = (record: EmojiRecord): ShortcodeCompletion => ({ record, shortcode: record.shortcodes[0] ?? record.name.replace(/\s+/g, "_"), match: null });

const highlightOf = (input: Input, ui: Ui) => (ui.highlight.generation === input.generation ? ui.highlight.index : 0);

export function createEmojiSuggestions(store: EmojiStore, options: SuggestionsOptions = {}) {
  // Options arrive every render, so they update silently: nothing subscribes to this store
  const input = createStore<Input, SuggestionsOptions>({ options, resetKey: resetKeyOf(options), generation: 0 }, reduceInput);
  const ui = createStore<Ui, UiAction>({ highlight: { index: 0, generation: 0 }, dismissed: null }, reduceUi);
  const search = createSearch(store);
  const opts = () => input.getSnapshot().options;
  const id = (suffix: string) => `${opts().id ?? "emoji-suggestions"}-${suffix}`;
  const suggestionsOf = memo((status: string, q: string, n: number, matchBy: string | undefined, order: CompletionOrder | undefined, searched: readonly EmojiRecord[]) =>
    status !== "ready" || !q ? NONE : matchBy === "search" ? searched.map(completionOf) : store.completeShortcode(q, n, order),
  );
  const keep = stable<SuggestionsSnapshot>();
  const select = memo((current: Input, state: Ui, status: string, searched: readonly EmojiRecord[]): SuggestionsSnapshot => {
    const { query: q = "", limit = 8, matchBy, order } = current.options;
    const suggestions = suggestionsOf(status, q, limit, matchBy, order, searched);
    const index = Math.min(highlightOf(current, state), Math.max(suggestions.length - 1, 0));
    const open = suggestions.length > 0 && state.dismissed !== current.resetKey;
    return keep({ query: q, open, suggestions, highlightedIndex: index, activeDescendant: open ? id(`option-${index}`) : undefined });
  });

  function getSnapshot(): SuggestionsSnapshot {
    const current = input.getSnapshot();
    const { query: q = "", limit = 8, matchBy } = current.options;
    return select(current, ui.getSnapshot(), store.status(), search.run(matchBy === "search" ? q : "", limit).results);
  }

  const highlight = (index: number) => {
    const current = input.getSnapshot();
    if (index === highlightOf(current, ui.getSnapshot())) return;
    ui.dispatch({ type: "highlight", index, generation: current.generation });
  };

  const machine = {
    getSnapshot,
    subscribe: subscribeAll(ui.subscribe, store.subscribe, search.subscribe),
    setOptions: (next: SuggestionsOptions) => input.dispatch(next),
    setQuery(q: string, key = q) {
      input.dispatch({ ...opts(), query: q, resetKey: key });
      ui.dispatch({ type: "refresh" });
    },
    highlight,
    move(direction: SuggestionsMove): boolean {
      const { open, suggestions, highlightedIndex: i } = getSnapshot();
      const n = suggestions.length;
      const columns = opts().columns;
      const step = columns ? { left: -1, right: 1, up: -columns, down: columns }[direction] : { up: -1, down: 1, left: 0, right: 0 }[direction];
      if (!open || !step) return false;
      highlight(columns ? Math.max(0, Math.min(n - 1, i + step)) : (i + step + n) % n);
      return true;
    },
    choose(index = getSnapshot().highlightedIndex) {
      const suggestion = getSnapshot().suggestions[index];
      if (!suggestion) return;
      const { unified, imageUrl } = suggestion.record;
      const selection = store.select(imageUrl ? unified : store.withSkinTone(unified));
      opts().onChoose?.(suggestion);
      if (selection) opts().onSelect?.(selection);
    },
    // For a selection another UI made and already recorded, such as a picker in the menu
    insert(selection: EmojiSelection) {
      const record = store.get(selection.baseUnified);
      if (!record) return;
      opts().onChoose?.(completionOf(record));
      opts().onSelect?.(selection);
    },
    dismiss() {
      ui.dispatch({ type: "dismiss", key: input.getSnapshot().resetKey });
      opts().onDismiss?.();
    },
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
    textFor: ({ record, shortcode }: ShortcodeCompletion, insert: "emoji" | "shortcode" = "emoji") => (record.imageUrl || insert === "shortcode" ? `:${shortcode}:` : unifiedToNative(store.withSkinTone(record.unified))),
    getListProps: () => ({ id: id("listbox"), role: "listbox" as const }),
    getOptionProps(index: number) {
      const selected = index === getSnapshot().highlightedIndex;
      return { id: id(`option-${index}`), role: "option" as const, "aria-selected": selected, "data-highlighted": selected ? ("" as const) : undefined };
    },
    getInputProps() {
      const { open, activeDescendant } = getSnapshot();
      return { role: "combobox" as const, "aria-autocomplete": "list" as const, "aria-expanded": open, "aria-controls": open ? id("listbox") : undefined, "aria-activedescendant": activeDescendant };
    },
    // For an editor element the app doesn't render: writes getInputProps() while open and restores its role after
    syncCombobox(el: Element): () => void {
      let role: string | null | undefined;
      const restore = () => {
        if (role === undefined) return;
        for (const name of Object.keys(machine.getInputProps())) el.removeAttribute(name);
        if (role) el.setAttribute("role", role);
        role = undefined;
      };
      const sync = () => {
        if (!getSnapshot().open) return restore();
        if (role === undefined) role = el.getAttribute("role");
        for (const [name, value] of Object.entries(machine.getInputProps())) {
          if (value === undefined) el.removeAttribute(name);
          else el.setAttribute(name, String(value));
        }
      };
      sync();
      const off = machine.subscribe(sync);
      return () => {
        off();
        restore();
      };
    },
  };
  return machine;
}

export type EmojiSuggestionsMachine = ReturnType<typeof createEmojiSuggestions>;
