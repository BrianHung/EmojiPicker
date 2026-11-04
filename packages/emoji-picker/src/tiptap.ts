import * as React from "react";
import type { Content, Editor, Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion, type SuggestionProps } from "@tiptap/suggestion";
import { findShortcodeTrigger } from "./core/shortcodes";
import type { ShortcodeSuggestion } from "./react/hooks";
import { useEmojiTypeahead, type EmojiTypeahead, type EmojiTypeaheadOptions } from "./react/typeahead";

export type { EmojiTypeahead, EmojiTypeaheadOptions } from "./react/typeahead";

export type TiptapEmojiTypeaheadOptions = EmojiTypeaheadOptions & {
  /** What replaces the typed `:query`; default the text and a space. Return a node for custom emoji (an image node). */
  content?: (text: string, suggestion: ShortcodeSuggestion) => Content;
};

type Match = { query: string; range: Range; rect: () => DOMRect | null };

/**
 * `:shortcode` typeahead for a Tiptap editor, on `@tiptap/suggestion`: registers its plugin
 * on the editor (no extension to add) and returns what an emoji menu renders.
 */
export function useTiptapEmojiTypeahead(editor: Editor | null, { content = (text) => `${text} `, ...options }: TiptapEmojiTypeaheadOptions = {}): EmojiTypeahead {
  const [match, setMatch] = React.useState<Match | null>(null);
  const typeahead = useEmojiTypeahead(
    match && {
      query: match.query,
      anchor: match.rect,
      replace: (text, s) => editor?.chain().focus().insertContentAt(match.range, content(text, s)).run(),
    },
    options,
    () => editor?.view.dom,
  );
  const { onKeyDown } = typeahead;
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const pluginKey = new PluginKey("emojiTypeahead");
    const sync = ({ query, range, clientRect }: SuggestionProps) => setMatch({ query, range, rect: () => clientRect?.() ?? null });
    const plugin = Suggestion({
      pluginKey,
      editor,
      findSuggestionMatch: ({ $position }) => {
        const before = $position.parent.textBetween(0, $position.parentOffset, undefined, "\ufffc");
        const found = findShortcodeTrigger(before);
        return found && { range: { from: $position.pos - (before.length - found.offset), to: $position.pos }, query: found.query, text: before.slice(found.offset) };
      },
      items: () => [],
      render: () => ({ onStart: sync, onUpdate: sync, onExit: () => setMatch(null), onKeyDown: ({ event }) => onKeyDown(event) }),
    });
    // First, so its keys (Enter, arrows) come before the editor's keymaps.
    editor.registerPlugin(plugin, (p, plugins) => [p, ...plugins]);
    return () => void (editor.isDestroyed || editor.unregisterPlugin(pluginKey));
  }, [editor, onKeyDown]);
  return typeahead;
}
