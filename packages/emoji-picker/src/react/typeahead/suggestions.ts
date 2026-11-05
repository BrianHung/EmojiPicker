import * as React from "react";
import type { ShortcodeCompletion } from "../../core/search/search-index";
import { createEmojiSuggestions, type EmojiSuggestionsMachine, type KeyLike, type SuggestionsOptions, type SuggestionsSnapshot } from "../../core/suggestions";
import { useEmojiStatus } from "../provider/hooks";
import { useEmojiContext } from "../provider/provider";

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
