import { EmojiPicker, type EmojiSelection } from "emoji-components";

const tone = "flex size-8 shrink-0 items-center justify-center rounded-md text-lg leading-none outline-none hover:bg-emoji-picker-hover focus-visible:bg-emoji-picker-hover";

export function InlinePicker({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root
      onSelect={onSelect}
      className="flex h-[380px] w-[352px] max-w-full flex-col overflow-hidden rounded-emoji-picker border border-emoji-picker-border bg-emoji-picker-background font-emoji-picker text-emoji-picker-foreground shadow-emoji-picker [--emoji-picker-cell-size:36px] [--emoji-picker-header-height:32px] [--emoji-picker-list-padding:8px] [--emoji-picker-emoji-size:24px]"
    >
      <EmojiPicker.Search className="flex items-center gap-2 p-3">
        <EmojiPicker.SearchField className="relative flex-1">
          <EmojiPicker.SearchInput className="h-8 w-full rounded-md border border-emoji-picker-input-border bg-emoji-picker-input pr-8 pl-3 text-sm text-emoji-picker-foreground outline-none placeholder:text-emoji-picker-subtle focus-visible:border-emoji-picker-ring">
            <EmojiPicker.SearchClear className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-emoji-picker-muted hover:bg-emoji-picker-hover">
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </EmojiPicker.SearchClear>
          </EmojiPicker.SearchInput>
        </EmojiPicker.SearchField>
        <EmojiPicker.SkinTone className="relative inline-flex">
          <EmojiPicker.SkinToneTrigger className={tone}>
            <EmojiPicker.SkinToneGlyph />
          </EmojiPicker.SkinToneTrigger>
          <EmojiPicker.SkinToneOptions className="end-0 top-1/2 flex -translate-y-1/2 rounded-lg border border-emoji-picker-border bg-emoji-picker-background p-0.5 shadow-emoji-picker">
            {(t) => (
              <EmojiPicker.SkinToneOption tone={t} className={tone}>
                <EmojiPicker.SkinToneGlyph />
              </EmojiPicker.SkinToneOption>
            )}
          </EmojiPicker.SkinToneOptions>
        </EmojiPicker.SkinTone>
      </EmojiPicker.Search>
      <EmojiPicker.Viewport className="relative min-h-0 flex-1">
        <EmojiPicker.List renderEmptyState={({ status }) => status === "empty" && <div className="py-10 text-center text-sm text-emoji-picker-muted">No emoji found.</div>}>
          {() => (
            <EmojiPicker.ListSection>
              <EmojiPicker.ListSectionTitle className="flex items-center bg-emoji-picker-background/90 px-3 pt-3 pb-1.5 text-xs font-medium text-emoji-picker-muted backdrop-blur" />
              <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className="flex items-center justify-center rounded-md outline-none hover:bg-emoji-picker-hover data-[focused]:bg-emoji-picker-selected forced-colors:data-[highlighted]:[outline:2px_solid_Highlight] forced-colors:data-[highlighted]:[outline-offset:-2px]" />}</EmojiPicker.ListItems>
            </EmojiPicker.ListSection>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
      <EmojiPicker.CategoryNav className="flex justify-between border-t border-emoji-picker-border px-2 py-1.5">
        {() => <EmojiPicker.CategoryNavTab className="flex size-8 items-center justify-center rounded-md text-emoji-picker-subtle hover:bg-emoji-picker-hover data-active:bg-emoji-picker-selected data-active:text-emoji-picker-foreground" />}
      </EmojiPicker.CategoryNav>
    </EmojiPicker.Root>
  );
}
