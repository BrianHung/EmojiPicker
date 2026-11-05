import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { ShortcodeCompletion } from "./search/search-index";
import { findShortcodeTrigger, isComposingKey } from "./shortcodes";
import type { EmojiStore } from "./store";
import { createStore } from "./reactive";
import { createEmojiSuggestions, syncCombobox, type KeyLike, type SuggestionsOptions } from "./suggestions";

type Node = EditorState["doc"];

export type ProseMirrorEmojiTypeaheadOptions = Pick<SuggestionsOptions, "id" | "limit" | "matchBy" | "order" | "columns"> & {
  insert?: "emoji" | "shortcode";
  content?: (text: string, suggestion: ShortcodeCompletion, schema: EditorState["schema"]) => string | Node | Node["content"] | readonly Node[];
  handleKeyDown?: (event: KeyLike) => boolean;
};

type Match = { query: string; from: number; to: number };

function matchIn({ selection: { $from, empty } }: EditorState): Match | null {
  const found = empty ? findShortcodeTrigger($from.parent.textBetween(0, $from.parentOffset, undefined, "￼")) : null;
  return found && { query: found.query, from: $from.start() + found.offset, to: $from.pos };
}

const keyOf = (match: Match | null) => (match ? `${match.from}:${match.query}` : "");

export function emojiTypeahead(store: EmojiStore, { insert = "emoji", content = (text) => `${text} `, handleKeyDown, ...options }: ProseMirrorEmojiTypeaheadOptions = {}) {
  const mounted = createStore<EditorView | null, EditorView | null>(null, (_, view) => view);
  const current = () => {
    const view = mounted.getSnapshot();
    const match = view && matchIn(view.state);
    return view && match ? { view, match } : null;
  };
  const suggestions = createEmojiSuggestions(store, {
    ...options,
    onChoose(suggestion) {
      const at = current();
      if (!at) return;
      const { view, match } = at;
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
      mounted.dispatch(editor);
      store.load().catch(() => {});
      const unsync = syncCombobox(editor.dom, suggestions);
      const sync = (state: EditorState, prev: EditorState | null) => {
        const match = matchIn(state);
        if (keyOf(match) !== (prev ? keyOf(matchIn(prev)) : "")) suggestions.setQuery(match?.query ?? "", keyOf(match));
      };
      sync(editor.state, null);
      return {
        update: (view, prev) => sync(view.state, prev),
        destroy() {
          mounted.dispatch(null);
          suggestions.setQuery("");
          unsync();
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
    anchor(): DOMRect | null {
      const at = current();
      if (!at) return null;
      const { view, match } = at;
      const start = view.coordsAtPos(match.from);
      const end = view.coordsAtPos(match.to);
      return new DOMRect(start.left, start.top, end.right - start.left, start.bottom - start.top);
    },
    keydown,
  };
}

export type ProseMirrorEmojiTypeahead = ReturnType<typeof emojiTypeahead>;
