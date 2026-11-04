import * as React from "react";
import { Emoji, type EmojiSelection } from "@brianhung/emoji-picker";
import { toast } from "@/components/ui/toast";

/** Copies a picked emoji (or a custom emoji's :shortcode:) and confirms with a toast: the emoji, its shortcode and name. */
function copyEmoji(selection: EmojiSelection) {
  const shortcode = selection.shortcode || `:${selection.shortcodes[0] ?? selection.unified}:`;
  navigator.clipboard?.writeText(selection.emoji || shortcode).catch(() => {});
  const icon = (
    <span data-slot="toast-icon" aria-hidden className="flex size-9 shrink-0 items-center justify-center text-[32px] leading-none">
      <Emoji emoji={selection} size={32} />
    </span>
  );
  toast.add({ title: <code className="font-mono text-[13px]">{shortcode}</code>, description: selection.name, data: { icon } });
}

/** The last picked emoji; picking also copies it and shows a toast. */
export function usePickedEmoji() {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  const pick = React.useCallback((selection: EmojiSelection) => {
    setPicked(selection);
    copyEmoji(selection);
  }, []);
  return [picked, pick] as const;
}
