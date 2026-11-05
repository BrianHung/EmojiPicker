import * as React from "react";
import { Emoji, type EmojiSelection } from "@brianhung/emoji-picker-react";
import { toast } from "@/components/ui/toast";

export function copyEmoji(selection: EmojiSelection) {
  const shortcode = selection.shortcode || `:${selection.shortcodes[0] ?? selection.unified}:`;
  navigator.clipboard?.writeText(selection.emoji || shortcode).catch(() => {});
  const icon = (
    <span data-slot="toast-icon" aria-hidden className="flex size-9 shrink-0 items-center justify-center text-[32px] leading-none">
      <Emoji emoji={selection} size={32} />
    </span>
  );
  toast.add({ title: <code className="font-mono text-[13px]">{shortcode}</code>, description: selection.name, data: { icon } });
}

export function usePickedEmoji() {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  const pick = React.useCallback((selection: EmojiSelection) => {
    setPicked(selection);
    copyEmoji(selection);
  }, []);
  return [picked, pick] as const;
}
