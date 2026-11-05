import { EmojiProvider } from "@brianhung/emoji-picker";
import en from "@brianhung/emoji-picker/data/en.json?url";

export function Providers({ children }: { children: React.ReactNode }) {
  return <EmojiProvider data={en}>{children}</EmojiProvider>;
}
