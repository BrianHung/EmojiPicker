import { EmojiProvider } from "@brianhung/emoji-picker";
import en from "@brianhung/emoji-picker-core/data/en.json?url";

export function Providers({ children }: { children: React.ReactNode }) {
  return <EmojiProvider data={en}>{children}</EmojiProvider>;
}
