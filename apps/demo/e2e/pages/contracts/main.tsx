import * as React from "react";
import { createRoot } from "react-dom/client";
import en from "@emoji-components/data/en/iamcal.json?url";
import { EmojiProvider, lexicalSearch, type EmojiSearch } from "emoji-components";
import { InlinePicker } from "@/components/demos/inline-picker/tailwind";
import { ReactionBar } from "@/components/demos/tapback/tailwind";
import { EmojiPicker, EmojiPickerContent, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import { Composer } from "@/docs/snippets/composer";
import { EmojiPickerPopover as BaseUiPopover } from "@/registry/emoji-picker-popover";
import { EmojiPickerPopover as FloatingUiPopover } from "@/registry/floating-ui/emoji-picker-popover";
import "@/globals.css";

type PopoverItem = React.ComponentType<Pick<React.ComponentProps<typeof BaseUiPopover>, "aria-label" | "onSelect" | "children">>;
// Outside the typecheck: it imports shadcn/ui's React Aria base, which vite.config.ts stands in for
const aria = import.meta.glob<{ EmojiPickerPopover: PopoverItem }>("../../../registry/aria/emoji-picker-popover.tsx", { eager: true });
const POPOVERS: [string, PopoverItem][] = [
  ["Base UI", BaseUiPopover],
  ["React Aria", Object.values(aria)[0]!.EmojiPickerPopover],
  ["Floating UI", FloatingUiPopover],
];

const lexical = lexicalSearch();
const search: EmojiSearch = (query, context) => ((window as { offline?: boolean }).offline ? Promise.reject(new Error("offline")) : lexical(query, context));
const picked = (selection: { emoji: string }) => (document.getElementById("picked")!.textContent = selection.emoji);

function Draft() {
  const field = React.useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <textarea ref={field} aria-label="Draft" />
      <BaseUiPopover aria-label="Insert emoji" finalFocus={field} onSelect={picked} picker={<EmojiPickerContent />}>
        🙂
      </BaseUiPopover>
    </>
  );
}

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
      {POPOVERS.map(([name, Popover]) => (
        <section key={name} aria-label={`${name} popover`}>
          <Popover aria-label="Open emoji picker" onSelect={picked}>
            🙂
          </Popover>
        </section>
      ))}
      <section aria-label="Draft">
        <Draft />
      </section>
    </EmojiProvider>
    <EmojiProvider data={en} search={search}>
      <section aria-label="Search">
        <EmojiPicker>
          <EmojiPickerSearch />
          <EmojiPickerContent />
        </EmojiPicker>
      </section>
    </EmojiProvider>
  </main>,
);
