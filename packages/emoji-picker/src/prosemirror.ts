import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { ShortcodeCompletion } from "./core/search-index";
import { findShortcodeTrigger, isComposingKey } from "./core/shortcodes";
import type { EmojiStore } from "./core/store";
import { createEmojiSuggestions, type KeyLike, type SuggestionsOptions } from "./core/suggestions";

type Node = EditorState["doc"];

export type ProseMirrorEmojiTypeaheadOptions = Pick<SuggestionsOptions, "id" | "limit" | "matchBy" | "order" | "columns"> & {
  /** What a choice inserts: the emoji (default) or `:shortcode:`. Custom emoji always insert their shortcode. */
  insert?: "emoji" | "shortcode";
  /** What replaces the typed `:query`; default the text and a space. Return nodes for custom emoji (an image node). */
  content?: (text: string, suggestion: ShortcodeCompletion, schema: EditorState["schema"]) => string | Node | Node["content"] | readonly Node[];
  /** Sees keys first while the list is open, for a menu with a layout of its own; true when it handled one. */
  handleKeyDown?: (event: KeyLike) => boolean;
};

type Match = { query: string; from: number; to: number };

function matchIn({ selection: { $from, empty } }: EditorState): Match | null {
  const found = empty ? findShortcodeTrigger($from.parent.textBetween(0, $from.parentOffset, undefined, "￼")) : null;
  return found && { query: found.query, from: $from.start() + found.offset, to: $from.pos };
}

/**
 * `:shortcode` typeahead for ProseMirror: add `plugin` to the editor (before its keymaps) and
 * render `suggestions` (core's store) however you like, at `anchor()`.
 */
export function emojiTypeahead(store: EmojiStore, { insert = "emoji", content = (text) => `${text} `, handleKeyDown, ...options }: ProseMirrorEmojiTypeaheadOptions = {}) {
  let view: EditorView | null = null;
  let match: Match | null = null;
  const suggestions = createEmojiSuggestions(store, {
    ...options,
    onChoose(suggestion) {
      if (!view || !match) return;
      const { tr, schema } = view.state;
      const replacement = content(suggestions.textFor(suggestion, insert), suggestion, schema);
      view.dispatch((typeof replacement === "string" ? tr.insertText(replacement, match.from, match.to) : tr.replaceWith(match.from, match.to, replacement)).scrollIntoView());
      view.focus();
    },
  });
  const keydown = (event: KeyLike) => (!isComposingKey(event) && suggestions.getSnapshot().open && !!handleKeyDown?.(event)) || suggestions.keydown(event);

  const plugin = new Plugin({
    key: new PluginKey("emojiTypeahead"),
    view(editor) {
      view = editor;
      store.load().catch(() => {});
      let saved: { role: string | null } | null = null;
      const combobox = () => {
        const { dom } = editor;
        const { open } = suggestions.getSnapshot();
        if (!open && !saved) return;
        saved ??= { role: dom.getAttribute("role") };
        for (const [name, value] of Object.entries(suggestions.getInputProps())) {
          if (open && value !== undefined) dom.setAttribute(name, String(value));
          else dom.removeAttribute(name);
        }
        if (open) return;
        if (saved.role) dom.setAttribute("role", saved.role);
        saved = null;
      };
      const off = suggestions.subscribe(combobox);
      let key = "";
      const update = ({ state }: EditorView) => {
        match = matchIn(state);
        const next = match ? `${match.from}:${match.query}` : "";
        if (next !== key) suggestions.setQuery(match?.query ?? "", (key = next));
      };
      update(editor);
      return {
        update,
        destroy() {
          view = match = null;
          suggestions.setQuery("");
          off();
        },
      };
    },
    props: {
      handleKeyDown: (_, event) => keydown(event),
      handleDOMEvents: { blur: () => void (suggestions.getSnapshot().open && suggestions.dismiss()) },
    },
  });

  return {
    plugin,
    suggestions,
    /** Where the typed `:query` is on screen, to position a menu; null when there's none. */
    anchor(): DOMRect | null {
      if (!view || !match) return null;
      const start = view.coordsAtPos(match.from);
      const end = view.coordsAtPos(match.to);
      return new DOMRect(start.left, start.top, end.right - start.left, start.bottom - start.top);
    },
    /** The plugin's key handling, to forward keys from elsewhere. */
    keydown,
  };
}

export type ProseMirrorEmojiTypeahead = ReturnType<typeof emojiTypeahead>;
