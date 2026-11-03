import { EmojiPicker, type EmojiSelection } from "@brianhung/emoji-picker";

export function InlinePicker({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root
      onSelect={onSelect}
      autoFocusSearch={false}
      className="flex h-[380px] w-[352px] max-w-full flex-col overflow-hidden rounded-picker border border-picker-border bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-cell-size:36px] [--emoji-header-height:32px] [--emoji-list-padding:8px] [--emoji-size:24px]"
    >
      <EmojiPicker.Search
        className="flex items-center gap-2 p-3"
        inputProps={{
          className:
            "h-8 w-full rounded-md border border-picker-input-border bg-picker-input px-3 text-sm text-picker-foreground outline-none placeholder:text-picker-subtle focus-visible:border-picker-ring",
        }}
      >
        <EmojiPicker.SkinTone
          emoji="270b"
          buttonClassName="flex size-8 shrink-0 items-center justify-center rounded-md text-lg leading-none outline-none hover:bg-picker-hover focus-visible:bg-picker-hover"
          optionsClassName="flex rounded-lg border border-picker-border bg-picker-background p-0.5 shadow-picker"
        />
      </EmojiPicker.Search>
      <EmojiPicker.Viewport className="relative min-h-0 flex-1">
        <EmojiPicker.List
          cellClassName="flex items-center justify-center rounded-md outline-none hover:bg-picker-hover data-[highlighted]:bg-picker-selected"
          headerClassName="bg-picker-background/90 px-3 pt-3 pb-1.5 text-xs font-medium text-picker-muted backdrop-blur"
        />
        <EmojiPicker.Empty className="py-10 text-center text-sm text-picker-muted">No emoji found.</EmojiPicker.Empty>
      </EmojiPicker.Viewport>
      <EmojiPicker.CategoryNav
        className="flex justify-between border-t border-picker-border px-2 py-1.5"
        tabClassName="flex size-8 items-center justify-center rounded-md text-picker-subtle hover:bg-picker-hover data-active:bg-picker-selected data-active:text-picker-foreground"
      />
    </EmojiPicker.Root>
  );
}
