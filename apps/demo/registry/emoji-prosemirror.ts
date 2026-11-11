import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { createEmojiSuggestions, findShortcodeTrigger, type EmojiStore, type ShortcodeCompletion, type EmojiSuggestionsOptions } from "@emoji-components/core";

type Node = EditorState["doc"];

export type ProseMirrorEmojiSuggestionsOptions = Pick<EmojiSuggestionsOptions, "id" | "limit" | "matchBy" | "order" | "columns" | "onSelect"> & {
  insertAs?: "emoji" | "shortcode";
  content?: (text: string, suggestion: ShortcodeCompletion, schema: EditorState["schema"]) => string | Node | Node["content"] | readonly Node[];
};

type Match = { query: string; from: number; to: number };

function matchIn({ selection: { $from, empty } }: EditorState): Match | null {
  const found = empty ? findShortcodeTrigger($from.parent.textBetween(0, $from.parentOffset, undefined, "￼")) : null;
  return found && { query: found.query, from: $from.start() + found.offset, to: $from.pos };
}

const keyOf = (match: Match | null) => (match ? `${match.from}:${match.query}` : "");

export function emojiSuggestions(store: EmojiStore, { insertAs = "emoji", content = (text) => `${text} `, ...options }: ProseMirrorEmojiSuggestionsOptions = {}) {
  let mounted: EditorView | null = null;
  const current = () => {
    const view = mounted;
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
      const replacement = content(suggestions.textFor(suggestion, insertAs), suggestion, schema);
      view.dispatch((typeof replacement === "string" ? tr.insertText(replacement, match.from, match.to) : tr.replaceWith(match.from, match.to, replacement)).scrollIntoView());
      view.focus();
    },
  });
  const key = new PluginKey("emojiSuggestions");
  const plugin = new Plugin({
    key,
    view(editor) {
      mounted = editor;
      store.load().catch(() => {});
      const unsync = suggestions.syncCombobox(editor.dom);
      const sync = (state: EditorState, prev: EditorState | null) => {
        const match = matchIn(state);
        if (keyOf(match) !== (prev ? keyOf(matchIn(prev)) : "")) suggestions.setQuery(match?.query ?? "", keyOf(match));
      };
      sync(editor.state, null);
      return {
        update: (view, prev) => sync(view.state, prev),
        destroy() {
          mounted = null;
          suggestions.setQuery("");
          unsync();
        },
      };
    },
    props: {
      handleKeyDown: (_, event) => suggestions.keydown(event),
      handleDOMEvents: { blur: () => void (suggestions.getSnapshot().open && suggestions.dismiss()) },
    },
  });

  return {
    plugin,
    key,
    suggestions,
    anchor(): DOMRect | null {
      const at = current();
      if (!at) return null;
      const { view, match } = at;
      const start = view.coordsAtPos(match.from);
      const end = view.coordsAtPos(match.to);
      return new DOMRect(start.left, start.top, end.right - start.left, start.bottom - start.top);
    },
  };
}

export type ProseMirrorEmojiSuggestions = ReturnType<typeof emojiSuggestions>;
