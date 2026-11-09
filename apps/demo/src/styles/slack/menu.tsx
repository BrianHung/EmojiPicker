import type { EmojiTypeahead, EmojiTypeaheadOptions } from "emoji-components";
import { cn } from "@/lib/utils";
import { slack } from "./picker";
import { StyleTypeahead } from "@/styles/variants";

export const slackEmojiOptions: EmojiTypeaheadOptions = { limit: 25 };

export function SlackEmojiMenu({ className, ...typeahead }: EmojiTypeahead & { className?: string }) {
  return <StyleTypeahead appStyle={slack} {...typeahead} className={cn("absolute bottom-[calc(100%-3px)] left-0 z-10", className)} />;
}
