import * as React from "react";
import { useEmojiSuggestions, type EmojiSuggestions, type EmojiSuggestionsOptions, type KeyLike, type ShortcodeSuggestion } from "./hooks";

/** What an editor tells `useEmojiTypeahead` while a `:query` is being typed. */
export type EmojiTrigger = {
  /** What follows the `:`. */
  query: string;
  /** The typed `:query` on screen, to anchor a menu. */
  anchor: () => DOMRect | null;
  /** Replace the typed `:query` with `text` (the emoji, or `:shortcode:`). */
  replace: (text: string, suggestion: ShortcodeSuggestion) => void;
};

export type EmojiTypeaheadOptions = Pick<EmojiSuggestionsOptions, "limit" | "matchBy" | "order" | "columns"> & {
  /** What a choice inserts: the emoji (default) or `:shortcode:`. Custom emoji always insert their shortcode. */
  insert?: "emoji" | "shortcode";
};

/** One `:shortcode` typeahead, whatever the editor: what a menu renders. */
export type EmojiTypeahead = {
  query: string;
  open: boolean;
  anchor: () => DOMRect | null;
  suggestions: EmojiSuggestions;
  dismiss(): void;
  /** Forward the editor's keydown here; true when it handled (and prevented) the key. */
  onKeyDown(event: KeyLike): boolean;
  /** Handles keys before `suggestions.onKeyDown` while open, for a layout of your own (a sectioned grid); return false to fall through. */
  keyHandler: React.RefObject<((event: KeyLike) => boolean) | null>;
};

const closed = () => null;

/**
 * The editor-agnostic `:shortcode` typeahead: give it the editor's current trigger
 * (`null` when none) and forward key events to `onKeyDown`. With `element`, it also
 * makes the editor a combobox while the menu is open (aria-expanded, -controls, -activedescendant).
 */
export function useEmojiTypeahead(trigger: EmojiTrigger | null, { insert = "emoji", ...options }: EmojiTypeaheadOptions = {}, element?: () => HTMLElement | null | undefined): EmojiTypeahead {
  const query = trigger && trigger.query.length > 1 ? trigger.query : "";
  const suggestions = useEmojiSuggestions({ ...options, query, onChoose: (s) => trigger?.replace(suggestions.textFor(s, insert), s) });
  const keyHandler = React.useRef<((event: KeyLike) => boolean) | null>(null);
  const latest = React.useRef(suggestions);
  latest.current = suggestions;
  const onKeyDown = React.useCallback((event: KeyLike) => {
    if ((event as { isComposing?: boolean }).isComposing || !latest.current.open) return false;
    return keyHandler.current?.(event) || latest.current.onKeyDown(event);
  }, []);
  useComboboxAttributes(element, suggestions);
  return { query, open: suggestions.open, anchor: trigger?.anchor ?? closed, suggestions, dismiss: suggestions.dismiss, onKeyDown, keyHandler };
}

function useComboboxAttributes(element: (() => HTMLElement | null | undefined) | undefined, { open, activeDescendant, getListProps, dismiss }: EmojiSuggestions) {
  const listId = getListProps().id;
  const dismissed = React.useRef(dismiss);
  dismissed.current = dismiss;
  React.useEffect(() => {
    const el = open ? element?.() : null;
    if (!el) return;
    const role = el.getAttribute("role");
    const attrs = { role: "combobox", "aria-autocomplete": "list", "aria-expanded": "true", "aria-controls": listId };
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    const blur = () => dismissed.current();
    el.addEventListener("blur", blur);
    return () => {
      el.removeEventListener("blur", blur);
      for (const name of Object.keys(attrs)) el.removeAttribute(name);
      if (role) el.setAttribute("role", role);
      el.removeAttribute("aria-activedescendant");
    };
  }, [open, listId]);
  React.useEffect(() => {
    const el = open ? element?.() : null;
    if (el && activeDescendant) el.setAttribute("aria-activedescendant", activeDescendant);
  }, [open, activeDescendant]);
}
