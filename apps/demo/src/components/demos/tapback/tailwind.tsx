import { EmojiPicker, type EmojiSelection } from "emoji-components";

const reaction = "flex size-10 items-center justify-center rounded-full text-[26px] transition-transform hover:scale-110 hover:bg-emoji-picker-hover";

export function ReactionBar({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root
      reactions={5}
      onSelect={(selection, { collapse }) => {
        onSelect(selection);
        collapse?.();
      }}
      className="flex w-fit max-w-full flex-col overflow-hidden rounded-full border border-emoji-picker-border bg-emoji-picker-background font-emoji-picker text-emoji-picker-foreground shadow-emoji-picker [--emoji-picker-cell-size:36px] [--emoji-picker-emoji-size:24px] has-[[data-slot=emoji-picker-panel]:not([hidden])]:h-[380px] has-[[data-slot=emoji-picker-panel]:not([hidden])]:w-[352px] has-[[data-slot=emoji-picker-panel]:not([hidden])]:rounded-emoji-picker"
    >
      <EmojiPicker.Reactions className="flex items-center gap-0.5 p-1.5 [--emoji-picker-emoji-image-size:28px]">
        <EmojiPicker.ReactionsItems>{(emoji) => <EmojiPicker.ReactionsItem emoji={emoji} className={reaction} />}</EmojiPicker.ReactionsItems>
        <EmojiPicker.ReactionsExpand className={reaction}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </EmojiPicker.ReactionsExpand>
      </EmojiPicker.Reactions>
      <EmojiPicker.Panel className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EmojiPicker.Search className="flex items-center p-3">
          <EmojiPicker.SearchField className="relative flex-1">
            <EmojiPicker.SearchInput className="h-8 w-full rounded-md border border-emoji-picker-input-border bg-emoji-picker-input pr-8 pl-3 text-sm outline-none placeholder:text-emoji-picker-subtle">
              <EmojiPicker.SearchClear className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-emoji-picker-muted hover:bg-emoji-picker-hover">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </EmojiPicker.SearchClear>
            </EmojiPicker.SearchInput>
          </EmojiPicker.SearchField>
        </EmojiPicker.Search>
        <EmojiPicker.Viewport className="relative min-h-0 flex-1">
          <EmojiPicker.List>
            {() => (
              <EmojiPicker.ListSection>
                <EmojiPicker.ListSectionTitle className="flex items-center bg-emoji-picker-background/90 px-3 pt-3 pb-1.5 text-xs font-medium text-emoji-picker-muted backdrop-blur" />
                <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className="flex items-center justify-center rounded-md outline-none hover:bg-emoji-picker-hover data-[focused]:bg-emoji-picker-selected" />}</EmojiPicker.ListItems>
              </EmojiPicker.ListSection>
            )}
          </EmojiPicker.List>
        </EmojiPicker.Viewport>
      </EmojiPicker.Panel>
    </EmojiPicker.Root>
  );
}
