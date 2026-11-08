import type { Editor } from "@tiptap/react";
import type { EmojiTypeaheadOptions } from "emoji-components";
import { useTiptapEmojiTypeahead } from "@/hooks/emoji-tiptap";
import { SuggestionMenu, type SuggestionMenuProps } from "@/components/suggestion-menu";
import { emojiContent } from "./emoji-node";

export function EmojiSuggestionMenu({ editor, className, side, ...options }: SuggestionMenuProps & EmojiTypeaheadOptions & { editor: Editor | null }) {
  const emoji = useTiptapEmojiTypeahead(editor, {
    ...options,
    content: (text, { record, shortcode }) => (record.imageUrl ? emojiContent({ unified: record.unified, shortcode, text: null }) : `${text} `),
  });
  return <SuggestionMenu {...emoji} className={className} side={side} />;
}
