import { createRoot } from "react-dom/client";
import en from "@emoji-components/data/en/iamcal.json?url";
import { EmojiProvider } from "emoji-components";
import "@emoji-components/twemoji-font/twemoji.css";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import "@/globals.css";
import { siteFrequents } from "@/lib/frequents";

document.documentElement.dataset.emojiFont = "twemoji";
document.documentElement.classList.toggle("dark", matchMedia("(prefers-color-scheme: dark)").matches);

createRoot(document.getElementById("root")!).render(
  <main className="p-6">
    <EmojiProvider data={en} renderer="native" defaultFrequents={siteFrequents}>
      <EmojiPicker className="h-[390px] shadow-none">
        <EmojiPickerSearch />
        <EmojiPickerContent />
        <EmojiPickerFooter />
      </EmojiPicker>
    </EmojiProvider>
  </main>,
);
