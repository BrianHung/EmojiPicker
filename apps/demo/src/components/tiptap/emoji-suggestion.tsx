// `:shortcode` suggestions for Tiptap: the library's typeahead and a menu at the caret. Custom emoji insert an EmojiNode.
import type { Editor } from "@tiptap/react";
import { useTiptapEmojiTypeahead, type EmojiTypeaheadOptions } from "@brianhung/emoji-picker/tiptap";
import { SuggestionMenu, type SuggestionMenuProps } from "@/components/suggestion-menu";
import { emojiContent } from "./emoji-node";

export function EmojiSuggestionMenu({ editor, className, side, ...options }: SuggestionMenuProps & EmojiTypeaheadOptions & { editor: Editor | null }) {
  const emoji = useTiptapEmojiTypeahead(editor, {
    ...options,
    content: (text, { record, shortcode }) => (record.imageUrl ? emojiContent({ unified: record.unified, shortcode, text: null }) : `${text} `),
  });
  return <SuggestionMenu {...emoji} className={className} side={side} />;
}
