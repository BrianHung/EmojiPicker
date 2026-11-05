import * as React from "react";
import { $getNodeByKey, $getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND, type LexicalNode, type NodeKey } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { findShortcodeTrigger } from "@brianhung/emoji-picker-core";
import { useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions, type ShortcodeSuggestion } from "./react/typeahead";

export type { EmojiTypeahead, EmojiTypeaheadOptions } from "./react/typeahead";

export type LexicalEmojiTypeaheadOptions = EmojiTypeaheadOptions & {
  node?: (text: string, suggestion: ShortcodeSuggestion) => LexicalNode;
};

type Match = { query: string; key: NodeKey; from: number; to: number };

export function useLexicalEmojiTypeahead({ node, ...options }: LexicalEmojiTypeaheadOptions = {}): EmojiTypeahead {
  const [editor] = useLexicalComposerContext();
  const [match, setMatch] = React.useState<Match | null>(null);
  const typeahead = useEmojiTypeahead(
    match && {
      query: match.query,
      anchor() {
        const text = editor.getElementByKey(match.key)?.firstChild;
        if (!text) return null;
        const range = document.createRange();
        range.setStart(text, match.from);
        range.setEnd(text, Math.min(match.to, text.textContent?.length ?? 0));
        return range.getBoundingClientRect();
      },
      replace: (text, s) =>
        editor.update(() => {
          const target = $getNodeByKey(match.key);
          if (!$isTextNode(target)) return;
          const selection = target.select(match.from, match.to);
          if (node) selection.insertNodes([node(text, s)]);
          else selection.insertText(`${text} `);
        }),
    },
    options,
    () => editor.getRootElement(),
  );
  const { onKeyDown } = typeahead;
  React.useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) =>
        editorState.read(() => {
          const selection = $getSelection();
          const anchor = $isRangeSelection(selection) && selection.isCollapsed() ? selection.anchor : null;
          const text = anchor?.type === "text" ? anchor.getNode() : null;
          const found = text?.isSimpleText() ? findShortcodeTrigger(text.getTextContent().slice(0, anchor!.offset)) : null;
          setMatch(found && { query: found.query, key: text!.getKey(), from: found.offset, to: anchor!.offset });
        }),
      ),
    [editor],
  );
  React.useEffect(() => editor.registerCommand(KEY_DOWN_COMMAND, onKeyDown, COMMAND_PRIORITY_HIGH), [editor, onKeyDown]);
  return typeahead;
}
