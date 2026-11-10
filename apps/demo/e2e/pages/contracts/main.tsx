import { createRoot } from "react-dom/client";
import en from "@emoji-components/data/en/iamcal.json?url";
import { EmojiProvider, lexicalSearch, type EmojiSearch } from "emoji-components";
import { InlinePicker } from "@/components/demos/inline-picker/tailwind";
import { PopoverPicker } from "@/components/demos/popover/tailwind";
import { ReactionBar } from "@/components/demos/tapback/tailwind";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import { Composer } from "@/docs/snippets/composer";
import "@/globals.css";

const lexical = lexicalSearch();
const search: EmojiSearch = (query, context) => ((window as { offline?: boolean }).offline ? Promise.reject(new Error("offline")) : lexical(query, context));
const picked = (selection: { emoji: string }) => (document.getElementById("picked")!.textContent = selection.emoji);

createRoot(document.getElementById("root")!).render(
  <main className="flex flex-col items-start gap-8 p-6">
    <output id="picked" />
    <EmojiProvider data={en}>
      <section aria-label="Composer">
        <Composer />
      </section>
      <section aria-label="Inline">
        <InlinePicker onSelect={picked} />
      </section>
      <section aria-label="Reactions">
        <ReactionBar onSelect={picked} />
      </section>
      <section aria-label="Popover">
        <PopoverPicker onSelect={picked} />
      </section>
    </EmojiProvider>
    <EmojiProvider data={en} search={search}>
      <section aria-label="Search">
        <EmojiPickerCard />
      </section>
    </EmojiProvider>
  </main>,
);
