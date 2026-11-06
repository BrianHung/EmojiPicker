import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { createEmojiSuggestions, findShortcodeTrigger, type EmojiStore, type ShortcodeCompletion, type EmojiSuggestionsOptions } from "@brianhung/emoji-picker-core";

type Node = EditorState["doc"];

export type ProseMirrorEmojiTypeaheadOptions = Pick<EmojiSuggestionsOptions, "id" | "limit" | "matchBy" | "order" | "columns" | "onSelect"> & {
  insert?: "emoji" | "shortcode";
  content?: (text: string, suggestion: ShortcodeCompletion, schema: EditorState["schema"]) => string | Node | Node["content"] | readonly Node[];
};

type Match = { query: string; from: number; to: number };

function matchIn({ selection: { $from, empty } }: EditorState): Match | null {
  const found = empty ? findShortcodeTrigger($from.parent.textBetween(0, $from.parentOffset, undefined, "￼")) : null;
  return found && { query: found.query, from: $from.start() + found.offset, to: $from.pos };
}

const keyOf = (match: Match | null) => (match ? `${match.from}:${match.query}` : "");

export function emojiTypeahead(store: EmojiStore, { insert = "emoji", content = (text) => `${text} `, ...options }: ProseMirrorEmojiTypeaheadOptions = {}) {
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
      const replacement = content(suggestions.textFor(suggestion, insert), suggestion, schema);
      view.dispatch((typeof replacement === "string" ? tr.insertText(replacement, match.from, match.to) : tr.replaceWith(match.from, match.to, replacement)).scrollIntoView());
      view.focus();
    },
  });
  const plugin = new Plugin({
    key: new PluginKey("emojiTypeahead"),
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

export type ProseMirrorEmojiTypeahead = ReturnType<typeof emojiTypeahead>;
