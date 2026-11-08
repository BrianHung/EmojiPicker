"use client";

import * as React from "react";
import { createNodeFromContent, type Content, type Editor } from "@tiptap/core";
import { useEmojiStore, useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions, type ShortcodeCompletion } from "emoji-components";
import { emojiTypeahead } from "@/lib/emoji-prosemirror";

export type TiptapEmojiTypeaheadOptions = EmojiTypeaheadOptions & {
  content?: (text: string, suggestion: ShortcodeCompletion) => Content;
};

export function useTiptapEmojiTypeahead(editor: Editor | null, { content, onSelect, insert, limit, matchBy, order, columns }: TiptapEmojiTypeaheadOptions = {}): EmojiTypeahead {
  const store = useEmojiStore();
  const id = React.useId();
  const latest = React.useRef({ content, onSelect });
  latest.current = { content, onSelect };
  const { plugin, suggestions, anchor } = React.useMemo(
    () =>
      emojiTypeahead(store, {
        id,
        insert,
        limit,
        matchBy,
        order,
        columns,
        onSelect: (selection) => latest.current.onSelect?.(selection),
        content(text, suggestion, schema) {
          const replacement = latest.current.content?.(text, suggestion) ?? `${text} `;
          return typeof replacement === "string" ? replacement : createNodeFromContent(replacement, schema);
        },
      }),
    [store, id, insert, limit, matchBy, order, columns],
  );
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.registerPlugin(plugin, (p, plugins) => [p, ...plugins]);
    return () => void (editor.isDestroyed || editor.unregisterPlugin(plugin.spec.key!));
  }, [editor, plugin]);
  return useEmojiTypeahead(suggestions, { anchor });
}
