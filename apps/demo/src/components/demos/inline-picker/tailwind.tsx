import { EmojiPicker, type EmojiSelection } from "@brianhung/emoji-picker-react";

const tone = "flex size-8 shrink-0 items-center justify-center rounded-md text-lg leading-none outline-none hover:bg-picker-hover focus-visible:bg-picker-hover";

export function InlinePicker({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root
      onSelect={onSelect}
      className="flex h-[380px] w-[352px] max-w-full flex-col overflow-hidden rounded-picker border border-picker-border bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-cell-size:36px] [--emoji-header-height:32px] [--emoji-list-padding:8px] [--emoji-size:24px]"
    >
      <EmojiPicker.Search className="flex items-center gap-2 p-3">
        <EmojiPicker.SearchInput className="h-8 w-full rounded-md border border-picker-input-border bg-picker-input px-3 text-sm text-picker-foreground outline-none placeholder:text-picker-subtle focus-visible:border-picker-ring" />
        <EmojiPicker.SkinTone className="relative inline-flex">
          <EmojiPicker.SkinToneTrigger className={tone}>
            <EmojiPicker.SkinToneGlyph />
          </EmojiPicker.SkinToneTrigger>
          <EmojiPicker.SkinToneOptions className="end-0 top-1/2 flex -translate-y-1/2 rounded-lg border border-picker-border bg-picker-background p-0.5 shadow-picker">
            {(t) => (
              <EmojiPicker.SkinToneOption tone={t} className={tone}>
                <EmojiPicker.SkinToneGlyph />
              </EmojiPicker.SkinToneOption>
            )}
          </EmojiPicker.SkinToneOptions>
        </EmojiPicker.SkinTone>
      </EmojiPicker.Search>
      <EmojiPicker.Viewport className="relative min-h-0 flex-1">
        <EmojiPicker.List renderEmptyState={({ status }) => status === "empty" && <div className="py-10 text-center text-sm text-picker-muted">No emoji found.</div>}>
          {() => (
            <EmojiPicker.ListSection>
              <EmojiPicker.ListSectionTitle className="flex items-center bg-picker-background/90 px-3 pt-3 pb-1.5 text-xs font-medium text-picker-muted backdrop-blur" />
              <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className="flex items-center justify-center rounded-md outline-none hover:bg-picker-hover data-[focused]:bg-picker-selected forced-colors:data-[highlighted]:[outline:2px_solid_Highlight] forced-colors:data-[highlighted]:[outline-offset:-2px]" />}</EmojiPicker.ListItems>
            </EmojiPicker.ListSection>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
      <EmojiPicker.CategoryNav className="flex justify-between border-t border-picker-border px-2 py-1.5">
        {() => <EmojiPicker.CategoryNavTab className="flex size-8 items-center justify-center rounded-md text-picker-subtle hover:bg-picker-hover data-active:bg-picker-selected data-active:text-picker-foreground" />}
      </EmojiPicker.CategoryNav>
    </EmojiPicker.Root>
  );
}
