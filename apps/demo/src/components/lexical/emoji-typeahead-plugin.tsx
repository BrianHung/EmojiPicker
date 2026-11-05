import { $createTextNode } from "lexical";
import { useLexicalEmojiTypeahead } from "@/hooks/emoji-lexical";
import { SuggestionMenu } from "@/components/suggestion-menu";
import { $createEmojiNode } from "./emoji-node";

export function EmojiTypeaheadPlugin() {
  const emoji = useLexicalEmojiTypeahead({
    node: (text, { record, shortcode }) => (record.imageUrl ? $createEmojiNode({ unified: record.unified, shortcode, text: null }) : $createTextNode(`${text} `)),
  });
  return <SuggestionMenu {...emoji} />;
}
