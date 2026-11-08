import type { EmojiTypeahead } from "emoji-components";
import { cn } from "@/lib/utils";
import { discord } from "./picker";
import { useFontStylesheet } from "@/styles/scene-kit";
import { StyleTypeahead } from "@/styles/variants";

export function DiscordEmojiMenu({ className, ...typeahead }: EmojiTypeahead & { className?: string }) {
  useFontStylesheet("https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap");
  return <StyleTypeahead appStyle={discord} {...typeahead} className={cn("absolute inset-x-0 bottom-full z-10 mb-2", className)} />;
}
