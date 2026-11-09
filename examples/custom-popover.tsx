import * as React from "react";
import { EmojiPicker, type EmojiSelection } from "emoji-components";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function EmojiButton({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label="Add emoji">😀</PopoverTrigger>
      <PopoverContent aria-label="Emoji picker" className="w-80 p-0">
        <EmojiPicker.Root
          onSelect={(selection) => {
            onSelect(selection);
            setOpen(false);
          }}
        >
          <EmojiPicker.Search>
            <EmojiPicker.SearchInput autoFocus />
          </EmojiPicker.Search>
          <EmojiPicker.Viewport className="h-72">
            <EmojiPicker.List />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
}
