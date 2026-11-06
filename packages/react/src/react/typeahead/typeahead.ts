import * as React from "react";
import type { EmojiStore, EmojiSuggestionsMachine, EmojiTrigger, KeyLike } from "@brianhung/emoji-picker-core";
import { useSuggestionsMachine, useSuggestionsStore, type EmojiSuggestionsOptions, type EmojiSuggestionsState } from "./suggestions";
import { useEmojiContext } from "../provider/provider";
import { useLatest } from "../utils/latest";
import { elementOf } from "../utils/utils";

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

export type TypeaheadElement = HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | null;

const targetOf = (element: TypeaheadElement | undefined): HTMLElement | null => (typeof element === "function" ? (element() ?? null) : elementOf(element));

export function useEmojiTypeahead(trigger: EmojiTrigger | null, { insert = "emoji", ...options }: EmojiTypeaheadOptions = {}, element?: TypeaheadElement): EmojiTypeahead {
  const query = trigger?.query ?? "";
  const machine = useSuggestionsMachine({ ...options, query, onChoose: (s) => trigger?.replace(machine.textFor(s, insert), s) });
  const suggestions = useSuggestionsStore(machine);
  const { open } = suggestions;
  const target = useLatest(element);
  React.useEffect(() => {
    const el = open ? targetOf(target.current) : null;
    if (!el) return;
    el.addEventListener("blur", machine.dismiss);
    const unsync = machine.syncCombobox(el);
    return () => {
      el.removeEventListener("blur", machine.dismiss);
      unsync();
    };
  }, [open, machine, target]);
  return { query, open, anchor: trigger?.anchor ?? closed, suggestions, dismiss: suggestions.dismiss, onKeyDown: suggestions.onKeyDown };
}

export type EmojiTypeaheadAdapter = { suggestions: EmojiSuggestionsMachine; anchor(): DOMRect | null };

export function useEmojiTypeaheadAdapter<T extends EmojiTypeaheadAdapter>(create: (store: EmojiStore, options: { id: string }) => T, deps: React.DependencyList): EmojiTypeahead & Omit<T, keyof EmojiTypeaheadAdapter> {
  const { store } = useEmojiContext();
  const id = React.useId();
  // biome-ignore lint/correctness/useExhaustiveDependencies: the caller lists what create depends on, as with useMemo
  const { suggestions: machine, anchor, ...rest } = React.useMemo(() => create(store, { id }), [store, id, ...deps]);
  const suggestions = useSuggestionsStore(machine);
  return { ...rest, query: suggestions.query, open: suggestions.open, anchor, suggestions, dismiss: suggestions.dismiss, onKeyDown: suggestions.onKeyDown };
}
