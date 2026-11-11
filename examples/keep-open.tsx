"use client";

import type { EmojiSelection } from "emoji-components";
import { Button } from "@/components/ui/button";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// The picker doesn't close a popover, so one you don't close in onSelect stays open
export function EmojiButton({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" aria-label="Add emoji" />}>😀</PopoverTrigger>
      <PopoverContent align="start" aria-label="Emoji picker" className="w-auto overflow-hidden p-0">
        <EmojiPicker onSelect={onSelect} className="rounded-none border-0 shadow-none">
          <EmojiPickerSearch autoFocus />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  );
}
