"use client";

import * as React from "react";
import { InputRange } from "dom-input-range";
import { findShortcodeTrigger } from "@emoji-components/core";
import { useSuggestions, type UseEmojiSuggestionsReturnValue, type UseEmojiSuggestionsOptions } from "./useEmojiSuggestions";

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;
type Match = { query: string; from: number; to: number };

const EVENTS = ["selectionchange", "click", "keyup", "focus"];

// The field is `ref`, or the element that spreads getInputProps()
export function useTextFieldEmojiSuggestions(options: Omit<UseEmojiSuggestionsOptions, "trigger" | "element"> = {}, ref?: React.RefObject<TextFieldElement | null>): UseEmojiSuggestionsReturnValue {
  const [match, setMatch] = React.useState<Match | null>(null);
  const own = React.useRef<HTMLElement | null>(null);
  const field = () => (ref?.current ?? own.current) as TextFieldElement | null;
  const suggestions = useSuggestions(
    {
      ...options,
      element: field,
      trigger: match && {
        query: match.query,
        // A controlled field re-renders inside its input event, before the match syncs to the new value
        anchor: () => {
          const el = field();
          return el ? new InputRange(el, Math.min(match.from, el.value.length), Math.min(match.to, el.value.length)).getBoundingClientRect() : null;
        },
        replace(text) {
          const el = field();
          if (!el) return;
          el.setSelectionRange(match.from, match.to);
          document.execCommand("insertText", false, /\s/.test(el.value.charAt(match.to)) ? text : `${text} `);
        },
      },
    },
    own,
    false,
  );
  const { onKeyDown } = suggestions;
  React.useEffect(() => {
    const el = (ref?.current ?? own.current) as TextFieldElement | null;
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
  return suggestions;
}
