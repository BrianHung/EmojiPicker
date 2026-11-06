import { createRoot } from "react-dom/client";
import en from "@brianhung/emoji-picker-core/data/en.json?url";
import { EmojiProvider } from "@brianhung/emoji-picker-react";
import "@brianhung/emoji-picker-twemoji-font/twemoji.css";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import "@/globals.css";

document.documentElement.dataset.emojiFont = "twemoji";

createRoot(document.getElementById("root")!).render(
  <main className="p-6">
    <EmojiProvider data={en} renderer="native">
      <EmojiPickerCard />
    </EmojiProvider>
  </main>,
);
