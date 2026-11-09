import { EmojiProvider, type EmojiImageUrl } from "emoji-components";
import { twemojiUrl } from "@emoji-components/core";
import "@emoji-components/twemoji-font/twemoji.css";

const art: Record<string, string> = { "2764-fe0f": "/reactions/heart.webp" };

const imageUrl: EmojiImageUrl = (unified, { renderer }) => art[unified] ?? (renderer === "image" ? twemojiUrl(unified) : undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmojiProvider renderer="auto" imageUrl={imageUrl}>
      <div className="[--emoji-font-family:Twemoji]">{children}</div>
    </EmojiProvider>
  );
}
