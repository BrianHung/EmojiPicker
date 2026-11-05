import * as React from "react";
import { isComposingKey, syncCombobox, type EmojiStore, type EmojiSuggestionsMachine, type EmojiTrigger } from "@brianhung/emoji-picker-core";
import { useSuggestionsMachine, useSuggestionsStore, type EmojiSuggestionsOptions, type EmojiSuggestionsState, type KeyLike } from "./suggestions";
import { useEmojiContext } from "../provider/provider";

export type EmojiTypeaheadOptions = Pick<EmojiSuggestionsOptions, "limit" | "matchBy" | "order" | "columns"> & {
  insert?: "emoji" | "shortcode";
};

export type EmojiTypeahead = {
  query: string;
  open: boolean;
  anchor: () => DOMRect | null;
  suggestions: EmojiSuggestionsState;
  dismiss(): void;
  onKeyDown(event: KeyLike): boolean;
  keyHandler: React.RefObject<((event: KeyLike) => boolean) | null>;
};

const closed = () => null;

export function useEmojiTypeahead(trigger: EmojiTrigger | null, { insert = "emoji", ...options }: EmojiTypeaheadOptions = {}, element?: () => HTMLElement | null | undefined): EmojiTypeahead {
  const query = trigger?.query ?? "";
  const machine = useSuggestionsMachine({ ...options, query, onChoose: (s) => trigger?.replace(machine.textFor(s, insert), s) });
  const suggestions = useSuggestionsStore(machine);
  const keyHandler = React.useRef<((event: KeyLike) => boolean) | null>(null);
  const latest = React.useRef(suggestions);
  latest.current = suggestions;
  const onKeyDown = React.useCallback((event: KeyLike) => {
    if (isComposingKey(event) || !latest.current.open) return false;
    return keyHandler.current?.(event) || latest.current.onKeyDown(event);
  }, []);
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
  return { query, open: suggestions.open, anchor: trigger?.anchor ?? closed, suggestions, dismiss: suggestions.dismiss, onKeyDown, keyHandler };
}

export type EmojiTypeaheadStore = { suggestions: EmojiSuggestionsMachine; anchor(): DOMRect | null; keydown(event: KeyLike): boolean };

export function useEmojiTypeaheadStore<T extends EmojiTypeaheadStore>(
  create: (store: EmojiStore, options: { id: string; handleKeyDown(event: KeyLike): boolean }) => T,
  deps: React.DependencyList,
): EmojiTypeahead & Omit<T, keyof EmojiTypeaheadStore> {
  const { store } = useEmojiContext();
  const id = React.useId();
  const keyHandler = React.useRef<((event: KeyLike) => boolean) | null>(null);
  const { suggestions: machine, anchor, keydown, ...rest } = React.useMemo(() => create(store, { id, handleKeyDown: (event) => keyHandler.current?.(event) ?? false }), [store, id, ...deps]);
  const suggestions = useSuggestionsStore(machine);
  return { ...rest, query: suggestions.query, open: suggestions.open, anchor, suggestions, dismiss: suggestions.dismiss, onKeyDown: keydown, keyHandler };
}
