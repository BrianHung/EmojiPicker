import type { Editor } from "@tiptap/react";
import type { UseEmojiSuggestionsOptions } from "emoji-components";
import { useTiptapEmojiSuggestions } from "@/hooks/use-emoji-tiptap";
import { EmojiSuggestions, type EmojiSuggestionsProps } from "@/components/ui/emoji-suggestions";
import { emojiContent } from "./emoji-node";

export function EmojiSuggestionsMenu({ editor, className, side, align, ...options }: Pick<EmojiSuggestionsProps, "className" | "side" | "align"> & UseEmojiSuggestionsOptions & { editor: Editor | null }) {
  const emoji = useTiptapEmojiSuggestions(editor, {
    ...options,
    content: (text, { record, shortcode }) => (record.imageUrl ? emojiContent({ unified: record.unified, shortcode, text: null }) : `${text} `),
  });
  return <EmojiSuggestions {...emoji} className={className} side={side} align={align} />;
}
