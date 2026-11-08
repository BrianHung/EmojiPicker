import { createRoot } from "react-dom/client";
import en from "@emoji-components/data/en/iamcal.json?url";
import { EmojiProvider } from "emoji-components";
import "@emoji-components/twemoji-font/twemoji.css";
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
