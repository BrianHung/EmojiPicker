"use client";

import * as React from "react";
import { createNodeFromContent, type Content, type Editor } from "@tiptap/core";
import { useEmojiStore, useEmojiSuggestions, type UseEmojiSuggestionsReturnValue, type UseEmojiSuggestionsOptions, type ShortcodeCompletion } from "emoji-components";
import { emojiSuggestions } from "@/lib/emoji-prosemirror";

export type TiptapEmojiSuggestionsOptions = UseEmojiSuggestionsOptions & {
  content?: (text: string, suggestion: ShortcodeCompletion) => Content;
};

export function useTiptapEmojiSuggestions(editor: Editor | null, { content, onSelect, insert, limit, matchBy, order, columns }: TiptapEmojiSuggestionsOptions = {}): UseEmojiSuggestionsReturnValue {
  const store = useEmojiStore();
  const id = React.useId();
  const latest = React.useRef({ content, onSelect });
  React.useEffect(() => {
    latest.current = { content, onSelect };
  });
  const { plugin, key, suggestions, anchor } = React.useMemo(
    () =>
      emojiSuggestions(store, {
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
    return () => void (editor.isDestroyed || editor.unregisterPlugin(key));
  }, [editor, plugin, key]);
  return useEmojiSuggestions(suggestions, { anchor });
}
