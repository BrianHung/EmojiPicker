"use client";

import * as React from "react";
import { InputRange } from "dom-input-range";
import { findShortcodeTrigger } from "@emoji-components/core";
import { useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions } from "./useEmojiTypeahead";

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;
type Match = { query: string; from: number; to: number };

const EVENTS = ["selectionchange", "click", "keyup", "focus"];

export function useTextFieldEmojiTypeahead(ref: React.RefObject<TextFieldElement | null>, options?: EmojiTypeaheadOptions): EmojiTypeahead {
  const [match, setMatch] = React.useState<Match | null>(null);
  const typeahead = useEmojiTypeahead(
    match && {
      query: match.query,
      // A controlled field re-renders inside its input event, before the match syncs to the new value
      anchor: () => {
        const el = ref.current;
        return el ? new InputRange(el, Math.min(match.from, el.value.length), Math.min(match.to, el.value.length)).getBoundingClientRect() : null;
      },
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
    const sync = () => matchAt(el.ownerDocument.activeElement === el && el.selectionEnd === el.selectionStart ? el.selectionStart : null);
    // Before React's handlers (at the root): a key the menu handled never reaches the app's own (Enter to send)
    const keydown = (event: Event) => void (onKeyDown(event as KeyboardEvent) && event.stopPropagation());
    const input = (event: Event) => event.target === el && sync();
    const blur = () => matchAt(null);
    for (const type of EVENTS) el.addEventListener(type, sync);
    el.addEventListener("blur", blur);
    el.addEventListener("keydown", keydown);
    el.ownerDocument.addEventListener("input", input);
    sync();
    return () => {
      for (const type of EVENTS) el.removeEventListener(type, sync);
      el.removeEventListener("blur", blur);
      el.removeEventListener("keydown", keydown);
      el.ownerDocument.removeEventListener("input", input);
    };
  }, [ref, onKeyDown]);
  return typeahead;
}
