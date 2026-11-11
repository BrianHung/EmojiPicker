"use client";

import * as React from "react";
import { useTextFieldEmojiSuggestions } from "emoji-components";
import { EmojiPickerPopover } from "@/components/ui/emoji-picker-popover";
import { EmojiSuggestions } from "@/components/ui/emoji-suggestions";

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  const suggestions = useTextFieldEmojiSuggestions({}, ref);
  return (
    <>
      <textarea
        ref={ref}
        aria-label="Message"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.nativeEvent.isComposing) return;
          e.preventDefault();
          onSend(value);
          setValue("");
        }}
      />
      <EmojiSuggestions {...suggestions} />
      <EmojiPickerPopover
        aria-label="Insert emoji"
        finalFocus={ref}
        onSelect={(selection) => {
          const el = ref.current;
          if (!el) return;
          el.setRangeText(selection.emoji || `:${selection.shortcode}:`, el.selectionStart, el.selectionEnd, "end");
          // setRangeText fires no input event, and a controlled field updates its state on one
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }}
      >
        🙂
      </EmojiPickerPopover>
    </>
  );
}
