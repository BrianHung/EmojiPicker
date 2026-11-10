import { $createTextNode } from "lexical";
import { useLexicalEmojiSuggestions } from "@/hooks/use-emoji-lexical";
import { EmojiSuggestions } from "@/components/ui/emoji-suggestions";
import { $createEmojiNode } from "./emoji-node";

export function EmojiSuggestionsPlugin() {
  const emoji = useLexicalEmojiSuggestions({
    node: (text, { record, shortcode }) => (record.imageUrl ? $createEmojiNode({ unified: record.unified, shortcode, text: null }) : $createTextNode(`${text} `)),
  });
  return <EmojiSuggestions {...emoji} />;
}
