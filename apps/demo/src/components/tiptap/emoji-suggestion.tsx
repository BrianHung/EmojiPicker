import type { Editor } from "@tiptap/react";
import type { EmojiTypeaheadOptions } from "emoji-components";
import { useTiptapEmojiTypeahead } from "@/hooks/use-emoji-tiptap";
import { EmojiSuggestions, type EmojiSuggestionsProps } from "@/components/ui/emoji-suggestions";
import { emojiContent } from "./emoji-node";

export function EmojiSuggestionMenu({ editor, className, side, ...options }: EmojiSuggestionsProps & EmojiTypeaheadOptions & { editor: Editor | null }) {
  const emoji = useTiptapEmojiTypeahead(editor, {
    ...options,
    content: (text, { record, shortcode }) => (record.imageUrl ? emojiContent({ unified: record.unified, shortcode, text: null }) : `${text} `),
  });
  return <EmojiSuggestions {...emoji} className={className} side={side} />;
}
