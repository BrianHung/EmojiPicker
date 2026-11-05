import { EmojiProvider } from "@brianhung/emoji-picker-react";
import en from "@brianhung/emoji-picker-core/data/en.json?url";

export function Providers({ children }: { children: React.ReactNode }) {
  return <EmojiProvider data={en}>{children}</EmojiProvider>;
}
