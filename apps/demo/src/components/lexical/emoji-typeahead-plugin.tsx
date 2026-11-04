// `:shortcode` suggestions for Lexical: the library's typeahead and a menu at the caret. Custom emoji insert an EmojiNode.
import { $createTextNode } from "lexical";
import { useLexicalEmojiTypeahead } from "@brianhung/emoji-picker/lexical";
import { SuggestionMenu } from "@/components/suggestion-menu";
import { $createEmojiNode } from "./emoji-node";

export function EmojiTypeaheadPlugin() {
  const emoji = useLexicalEmojiTypeahead({
    node: (text, { record, shortcode }) => (record.imageUrl ? $createEmojiNode({ unified: record.unified, shortcode, text: null }) : $createTextNode(`${text} `)),
  });
  return <SuggestionMenu {...emoji} />;
}
