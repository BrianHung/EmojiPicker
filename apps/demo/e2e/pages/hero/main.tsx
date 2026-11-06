import { createRoot } from "react-dom/client";
import en from "@brianhung/emoji-picker-data/en/iamcal.json?url";
import { EmojiPicker, EmojiProvider } from "@brianhung/emoji-picker-react";
import "@brianhung/emoji-picker-twemoji-font/twemoji.css";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import "@/globals.css";

document.documentElement.dataset.emojiFont = "twemoji";
document.documentElement.classList.toggle("dark", matchMedia("(prefers-color-scheme: dark)").matches);

createRoot(document.getElementById("root")!).render(
  <main className="p-6">
    <EmojiProvider data={en} renderer="native">
      <EmojiPickerCard
        className="shadow-none [&_[data-slot=emoji-picker-preview]>span:first-child]:[font-family:var(--emoji-font-family)]"
        rows={
          <EmojiPicker.CategoryNav className="flex shrink-0 justify-between border-b border-border px-1.5 py-1">
            {() => <EmojiPicker.CategoryNav.Tab className="flex size-8 items-center justify-center rounded-md p-[7px] text-muted-foreground outline-none hover:bg-accent data-active:bg-accent data-active:text-foreground" />}
          </EmojiPicker.CategoryNav>
        }
      />
    </EmojiProvider>
  </main>,
);
