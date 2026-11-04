import * as React from "react";
import { createNodeFromContent, type Content, type Editor } from "@tiptap/core";
import { emojiTypeahead } from "./prosemirror";
import type { ShortcodeSuggestion } from "./react/hooks";
import { useEmojiTypeaheadStore, type EmojiTypeahead, type EmojiTypeaheadOptions } from "./react/typeahead";

export type { EmojiTypeahead, EmojiTypeaheadOptions } from "./react/typeahead";

export type TiptapEmojiTypeaheadOptions = EmojiTypeaheadOptions & {
  /** What replaces the typed `:query`; default the text and a space. Return a node for custom emoji (an image node). */
  content?: (text: string, suggestion: ShortcodeSuggestion) => Content;
};

/** `:shortcode` typeahead for a Tiptap editor: registers the ProseMirror plugin on it (no extension to add) and returns what an emoji menu renders. */
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
    // First, so its keys (Enter, arrows) come before the editor's keymaps.
    editor.registerPlugin(plugin, (p, plugins) => [p, ...plugins]);
    return () => void (editor.isDestroyed || editor.unregisterPlugin(plugin.spec.key!));
  }, [editor, plugin]);
  return typeahead;
}
