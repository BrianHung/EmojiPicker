import { EmojiProvider } from "@brianhung/emoji-picker-react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <EmojiProvider>{children}</EmojiProvider>;
}
