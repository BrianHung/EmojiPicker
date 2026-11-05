import * as React from "react";
import { InputRange } from "dom-input-range";
import { findShortcodeTrigger } from "../core/shortcodes";
import { useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions } from "./typeahead";

type TextField = HTMLInputElement | HTMLTextAreaElement;
type Match = { query: string; from: number; to: number };

const EVENTS = ["selectionchange", "click", "keyup"];

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
    const matchAt = (to: number | null) => {
      const found = to == null ? null : findShortcodeTrigger(el.value.slice(0, to));
      setMatch((prev) => (found && to != null ? (prev && prev.query === found.query && prev.from === found.offset ? prev : { query: found.query, from: found.offset, to }) : null));
    };
    const sync = () => matchAt(el.selectionEnd === el.selectionStart ? el.selectionStart : null);
    // Before React's handlers (at the root): a key the menu handled never reaches the app's own (Enter to send).
    const keydown = (event: Event) => void (onKeyDown(event as KeyboardEvent) && event.stopPropagation());
    // After them: a controlled field's onChange must commit the new value before this re-renders it.
    const input = (event: Event) => event.target === el && sync();
    for (const type of EVENTS) el.addEventListener(type, sync);
    el.addEventListener("keydown", keydown);
    el.ownerDocument.addEventListener("input", input);
    // A field that starts with a `:query` opens on it (an unfocused field's caret is taken to be at its end),
    // until focus first lands elsewhere, as it would close on blur.
    const elsewhere = (event: FocusEvent) => {
      el.ownerDocument.removeEventListener("focusin", elsewhere);
      if (event.target !== el) matchAt(null);
    };
    if (el.ownerDocument.activeElement === el) sync();
    else matchAt(el.value.length);
    el.ownerDocument.addEventListener("focusin", elsewhere);
    return () => {
      for (const type of EVENTS) el.removeEventListener(type, sync);
      el.removeEventListener("keydown", keydown);
      el.ownerDocument.removeEventListener("input", input);
      el.ownerDocument.removeEventListener("focusin", elsewhere);
    };
  }, [ref, onKeyDown]);
  return typeahead;
}
