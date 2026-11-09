"use client";

import * as React from "react";
import { $getNodeByKey, $getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND, type LexicalNode, type NodeKey } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { findShortcodeTrigger, useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions, type ShortcodeCompletion } from "emoji-components";

export type LexicalEmojiTypeaheadOptions = EmojiTypeaheadOptions & {
  node?: (text: string, suggestion: ShortcodeCompletion) => LexicalNode;
};

type Match = { query: string; key: NodeKey; from: number; to: number };

function $matchAtSelection(): Match | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  const { offset } = selection.anchor;
  const text = selection.anchor.getNode();
  if (!$isTextNode(text) || !text.isSimpleText()) return null;
  const found = findShortcodeTrigger(text.getTextContent().slice(0, offset));
  return found && { query: found.query, key: text.getKey(), from: found.offset, to: offset };
}

export function useLexicalEmojiTypeahead({ node, ...options }: LexicalEmojiTypeaheadOptions = {}): EmojiTypeahead {
  const [editor] = useLexicalComposerContext();
  const [match, setMatch] = React.useState<Match | null>(null);
  const typeahead = useEmojiTypeahead(
    match && {
      query: match.query,
      anchor() {
        const text = editor.getElementByKey(match.key)?.firstChild;
        if (!text) return null;
        const length = text.textContent?.length ?? 0;
        const range = document.createRange();
        range.setStart(text, Math.min(match.from, length));
        range.setEnd(text, Math.min(match.to, length));
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
      editor.registerUpdateListener(({ editorState }) => editorState.read(() => setMatch($matchAtSelection()))),
    [editor],
  );
  React.useEffect(() => editor.registerCommand(KEY_DOWN_COMMAND, onKeyDown, COMMAND_PRIORITY_HIGH), [editor, onKeyDown]);
  return typeahead;
}
