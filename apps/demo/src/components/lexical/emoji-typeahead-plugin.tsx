import { $createTextNode } from "lexical";
import { useLexicalEmojiTypeahead } from "@/hooks/use-emoji-lexical";
import { EmojiSuggestions } from "@/components/ui/emoji-suggestions";
import { $createEmojiNode } from "./emoji-node";

export function EmojiTypeaheadPlugin() {
  const emoji = useLexicalEmojiTypeahead({
    node: (text, { record, shortcode }) => (record.imageUrl ? $createEmojiNode({ unified: record.unified, shortcode, text: null }) : $createTextNode(`${text} `)),
  });
  return <EmojiSuggestions {...emoji} />;
}
