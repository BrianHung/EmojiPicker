import { EmojiProvider } from "emoji-components";

export function Providers({ children }: { children: React.ReactNode }) {
  return <EmojiProvider>{children}</EmojiProvider>;
}
