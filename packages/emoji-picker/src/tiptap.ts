import * as React from "react";
import { createNodeFromContent, type Content, type Editor } from "@tiptap/core";
import { emojiTypeahead } from "@brianhung/emoji-picker-core/prosemirror";
import { useEmojiTypeaheadStore, type EmojiTypeahead, type EmojiTypeaheadOptions, type ShortcodeSuggestion } from "./react/typeahead";

export type { EmojiTypeahead, EmojiTypeaheadOptions } from "./react/typeahead";

export type TiptapEmojiTypeaheadOptions = EmojiTypeaheadOptions & {
  content?: (text: string, suggestion: ShortcodeSuggestion) => Content;
};

export function useTiptapEmojiTypeahead(editor: Editor | null, { content, insert, limit, matchBy, order, columns }: TiptapEmojiTypeaheadOptions = {}): EmojiTypeahead {
  const latest = React.useRef(content);
  latest.current = content;
  const { plugin, ...typeahead } = useEmojiTypeaheadStore(
    (store, options) =>
      emojiTypeahead(store, {
        ...options,
        insert,
        limit,
        matchBy,
        order,
        columns,
        content(text, suggestion, schema) {
          const replacement = latest.current?.(text, suggestion) ?? `${text} `;
          return typeof replacement === "string" ? replacement : createNodeFromContent(replacement, schema);
        },
      }),
    [insert, limit, matchBy, order, columns],
  );
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.registerPlugin(plugin, (p, plugins) => [p, ...plugins]);
    return () => void (editor.isDestroyed || editor.unregisterPlugin(plugin.spec.key!));
  }, [editor, plugin]);
  return typeahead;
}
