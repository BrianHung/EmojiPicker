import * as React from "react";
import { syncCombobox, type EmojiStore, type EmojiSuggestionsMachine, type EmojiTrigger, type KeyLike } from "@brianhung/emoji-picker-core";
import { useSuggestionsMachine, useSuggestionsStore, type EmojiSuggestionsOptions, type EmojiSuggestionsState } from "./suggestions";
import { useEmojiContext } from "../provider/provider";

export type EmojiTypeaheadOptions = Pick<EmojiSuggestionsOptions, "limit" | "matchBy" | "order" | "columns" | "onSelect"> & {
  insert?: "emoji" | "shortcode";
};

export type EmojiTypeahead = {
  query: string;
  open: boolean;
  anchor: () => DOMRect | null;
  suggestions: EmojiSuggestionsState;
  dismiss(): void;
  onKeyDown(event: KeyLike): boolean;
};

const closed = () => null;

export function useEmojiTypeahead(trigger: EmojiTrigger | null, { insert = "emoji", ...options }: EmojiTypeaheadOptions = {}, element?: () => HTMLElement | null | undefined): EmojiTypeahead {
  const query = trigger?.query ?? "";
  const machine = useSuggestionsMachine({ ...options, query, onChoose: (s) => trigger?.replace(machine.textFor(s, insert), s) });
  const suggestions = useSuggestionsStore(machine);
  const { open } = suggestions;
  React.useEffect(() => {
    const el = open ? element?.() : null;
    if (!el) return;
    el.addEventListener("blur", machine.dismiss);
    const unsync = syncCombobox(el, machine);
    return () => {
      el.removeEventListener("blur", machine.dismiss);
      unsync();
    };
  }, [open, machine]);
  return { query, open, anchor: trigger?.anchor ?? closed, suggestions, dismiss: suggestions.dismiss, onKeyDown: suggestions.onKeyDown };
}

export type EmojiTypeaheadAdapter = { suggestions: EmojiSuggestionsMachine; anchor(): DOMRect | null };

export function useEmojiTypeaheadAdapter<T extends EmojiTypeaheadAdapter>(create: (store: EmojiStore, options: { id: string }) => T, deps: React.DependencyList): EmojiTypeahead & Omit<T, keyof EmojiTypeaheadAdapter> {
  const { store } = useEmojiContext();
  const id = React.useId();
  const { suggestions: machine, anchor, ...rest } = React.useMemo(() => create(store, { id }), [store, id, ...deps]);
  const suggestions = useSuggestionsStore(machine);
  return { ...rest, query: suggestions.query, open: suggestions.open, anchor, suggestions, dismiss: suggestions.dismiss, onKeyDown: suggestions.onKeyDown };
}
