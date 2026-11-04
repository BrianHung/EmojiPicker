import * as React from "react";
import { InputRange } from "dom-input-range";
import { findShortcodeTrigger } from "../core/shortcodes";
import { useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions } from "./typeahead";

type TextField = HTMLInputElement | HTMLTextAreaElement;
type Match = { query: string; from: number; to: number };

const EVENTS = ["input", "selectionchange", "click", "keyup"];

/**
 * `useEmojiTypeahead` for an `<input>` or `<textarea>`, controlled or not: finds the `:query`
 * before the caret, anchors at it, and inserts with the browser's undo intact.
 */
export function useTextFieldEmojiTypeahead(ref: React.RefObject<TextField | null>, options?: EmojiTypeaheadOptions): EmojiTypeahead {
  const [match, setMatch] = React.useState<Match | null>(null);
  const typeahead = useEmojiTypeahead(
    match && {
      query: match.query,
      anchor: () => (ref.current ? new InputRange(ref.current, match.from, match.to).getBoundingClientRect() : null),
      replace(text) {
        ref.current?.setSelectionRange(match.from, match.to);
        document.execCommand("insertText", false, `${text} `);
      },
    },
    options,
    () => ref.current,
  );
  const { onKeyDown } = typeahead;
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      const to = el.selectionStart ?? 0;
      const found = el.selectionEnd === to ? findShortcodeTrigger(el.value.slice(0, to)) : null;
      setMatch((prev) => (found ? (prev && prev.query === found.query && prev.from === found.offset ? prev : { query: found.query, from: found.offset, to }) : null));
    };
    // Before React's handlers (at the root): a key the menu handled never reaches the app's own (Enter to send).
    const keydown = (event: Event) => void (onKeyDown(event as KeyboardEvent) && event.stopPropagation());
    for (const type of EVENTS) el.addEventListener(type, sync);
    el.addEventListener("keydown", keydown);
    return () => {
      for (const type of EVENTS) el.removeEventListener(type, sync);
      el.removeEventListener("keydown", keydown);
    };
  }, [ref, onKeyDown]);
  return typeahead;
}
