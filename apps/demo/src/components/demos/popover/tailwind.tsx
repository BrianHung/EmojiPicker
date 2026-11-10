import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { emojiPickerInitialFocus, type EmojiSelection } from "emoji-components";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";

export function PopoverPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label="Open emoji picker"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm transition-transform outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] data-popup-open:bg-accent"
      >
        <span className="text-base">{picked?.emoji || "🙂"}</span> Add reaction
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={8} positionMethod="fixed" className="z-50">
          <Popover.Popup
            ref={popup}
            initialFocus={() => emojiPickerInitialFocus(popup.current)}
            aria-label="Emoji picker"
            className="origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95"
          >
            <EmojiPicker
              onSelect={(selection) => {
                setPicked(selection);
                onSelect(selection);
                setOpen(false);
              }}
            >
              <EmojiPickerSearch autoFocus />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
