import { EmojiPicker, Tapback, type EmojiSelection } from "@brianhung/emoji-picker-react";

const reaction = "flex size-10 items-center justify-center rounded-full text-[26px] transition-transform hover:scale-110 hover:bg-picker-hover";

export function ReactionBar({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <Tapback
      onSelect={onSelect}
      className="flex w-fit max-w-full flex-col overflow-hidden rounded-full border border-picker-border bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-cell-size:36px] [--emoji-size:24px] has-[[data-slot=emoji-picker-panel]:not([hidden])]:h-[380px] has-[[data-slot=emoji-picker-panel]:not([hidden])]:w-[352px] has-[[data-slot=emoji-picker-panel]:not([hidden])]:rounded-picker"
    >
      <EmojiPicker.Reactions className="flex items-center gap-0.5 p-1.5 [--emoji-image-size:28px]">
        <EmojiPicker.Reactions.Items>{(emoji) => <EmojiPicker.Reactions.Item emoji={emoji} className={reaction} />}</EmojiPicker.Reactions.Items>
        <EmojiPicker.Reactions.Expand className={reaction}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </EmojiPicker.Reactions.Expand>
      </EmojiPicker.Reactions>
      <EmojiPicker.Panel className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EmojiPicker.Search className="flex items-center p-3">
          <EmojiPicker.Search.Input className="h-8 w-full rounded-md border border-picker-input-border bg-picker-input px-3 text-sm outline-none placeholder:text-picker-subtle" />
        </EmojiPicker.Search>
        <EmojiPicker.Viewport className="relative min-h-0 flex-1">
          <EmojiPicker.List>
            {() => (
              <EmojiPicker.List.Section>
                <EmojiPicker.List.SectionTitle className="flex items-center bg-picker-background/90 px-3 pt-3 pb-1.5 text-xs font-medium text-picker-muted backdrop-blur" />
                <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className="flex items-center justify-center rounded-md outline-none hover:bg-picker-hover data-[highlighted]:bg-picker-selected" />}</EmojiPicker.List.Items>
              </EmojiPicker.List.Section>
            )}
          </EmojiPicker.List>
        </EmojiPicker.Viewport>
      </EmojiPicker.Panel>
    </Tapback>
  );
}
