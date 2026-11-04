// `:shortcode` typeahead for a plain ProseMirror editor: add `plugin` to the editor's plugins.
import * as React from "react";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { findShortcodeTrigger, useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions } from "@brianhung/emoji-picker";

type Match = { query: string; from: number; to: number };

function matchIn(view: EditorView): Match | null {
  const { $from, empty } = view.state.selection;
  const found = empty ? findShortcodeTrigger($from.parent.textBetween(0, $from.parentOffset, undefined, "￼")) : null;
  return found && { query: found.query, from: $from.start() + found.offset, to: $from.pos };
}

export function useProseMirrorEmojiTypeahead(options?: EmojiTypeaheadOptions): EmojiTypeahead & { plugin: Plugin } {
  const [view, setView] = React.useState<EditorView | null>(null);
  const [match, setMatch] = React.useState<Match | null>(null);
  const typeahead = useEmojiTypeahead(
    view && match && {
      query: match.query,
      anchor() {
        const start = view.coordsAtPos(match.from);
        const end = view.coordsAtPos(match.to);
        return new DOMRect(start.left, start.top, end.right - start.left, start.bottom - start.top);
      },
      replace(text) {
        view.dispatch(view.state.tr.insertText(`${text} `, match.from, match.to));
        view.focus();
      },
    },
    options,
    () => view?.dom,
  );
  const { onKeyDown } = typeahead;
  const plugin = React.useMemo(
    () =>
      new Plugin({
        view(editor) {
          const update = (v: EditorView) => setMatch((prev) => {
            const next = matchIn(v);
            return next && prev && next.query === prev.query && next.from === prev.from ? prev : next;
          });
          setView(editor);
          update(editor);
          return { update, destroy: () => setView(null) };
        },
        props: { handleKeyDown: (_, event) => onKeyDown(event) },
      }),
    [onKeyDown],
  );
  return { ...typeahead, plugin };
}
