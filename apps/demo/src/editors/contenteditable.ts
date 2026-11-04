// `:shortcode` typeahead for a plain contenteditable: the `:query` from the Selection, inserted with execCommand (undo intact).
import * as React from "react";
import { findShortcodeTrigger, useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions } from "@brianhung/emoji-picker";

type Match = { query: string; node: Text; from: number; to: number };

const rangeOf = ({ node, from, to }: Match) => {
  const range = document.createRange();
  range.setStart(node, from);
  range.setEnd(node, to);
  return range;
};

export function useContentEditableEmojiTypeahead(ref: React.RefObject<HTMLElement | null>, options?: EmojiTypeaheadOptions): EmojiTypeahead {
  const [match, setMatch] = React.useState<Match | null>(null);
  const typeahead = useEmojiTypeahead(
    match && {
      query: match.query,
      anchor: () => (match.node.isConnected ? rangeOf(match).getBoundingClientRect() : null),
      replace(text) {
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(rangeOf(match));
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
      const selection = getSelection();
      const node = selection?.anchorNode;
      const found = selection?.isCollapsed && node instanceof Text && el.contains(node) ? findShortcodeTrigger(node.data.slice(0, selection.anchorOffset)) : null;
      setMatch((prev) => (found ? (prev && prev.node === node && prev.query === found.query && prev.from === found.offset ? prev : { query: found.query, node: node as Text, from: found.offset, to: selection!.anchorOffset }) : null));
    };
    const keydown = (event: KeyboardEvent) => void (onKeyDown(event) && event.stopPropagation());
    el.addEventListener("input", sync);
    el.addEventListener("keydown", keydown);
    document.addEventListener("selectionchange", sync);
    return () => {
      el.removeEventListener("input", sync);
      el.removeEventListener("keydown", keydown);
      document.removeEventListener("selectionchange", sync);
    };
  }, [ref, onKeyDown]);
  return typeahead;
}
