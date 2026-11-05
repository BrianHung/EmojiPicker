import { EmojiPicker, type EmojiSelection } from "@brianhung/emoji-picker";

const tone = "flex size-8 shrink-0 items-center justify-center rounded-md text-lg leading-none outline-none hover:bg-picker-hover focus-visible:bg-picker-hover";

export function InlinePicker({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root
      onSelect={onSelect}
      className="flex h-[380px] w-[352px] max-w-full flex-col overflow-hidden rounded-picker border border-picker-border bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-cell-size:36px] [--emoji-header-height:32px] [--emoji-list-padding:8px] [--emoji-size:24px]"
    >
      <EmojiPicker.Search className="flex items-center gap-2 p-3">
        <EmojiPicker.Search.Input className="h-8 w-full rounded-md border border-picker-input-border bg-picker-input px-3 text-sm text-picker-foreground outline-none placeholder:text-picker-subtle focus-visible:border-picker-ring" />
        <EmojiPicker.SkinTone>
          <EmojiPicker.SkinTone.Trigger className={tone}>
            <EmojiPicker.SkinTone.Glyph />
          </EmojiPicker.SkinTone.Trigger>
          <EmojiPicker.SkinTone.Options className="flex rounded-lg border border-picker-border bg-picker-background p-0.5 shadow-picker">
            {(t) => (
              <EmojiPicker.SkinTone.Option tone={t} className={tone}>
                <EmojiPicker.SkinTone.Glyph />
              </EmojiPicker.SkinTone.Option>
            )}
          </EmojiPicker.SkinTone.Options>
        </EmojiPicker.SkinTone>
      </EmojiPicker.Search>
      <EmojiPicker.Viewport className="relative min-h-0 flex-1">
        <EmojiPicker.List>
          {() => (
            <EmojiPicker.List.Section>
              <EmojiPicker.List.SectionTitle className="flex items-center bg-picker-background/90 px-3 pt-3 pb-1.5 text-xs font-medium text-picker-muted backdrop-blur" />
              <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className="flex items-center justify-center rounded-md outline-none hover:bg-picker-hover data-[highlighted]:bg-picker-selected forced-colors:data-[highlighted]:[outline:2px_solid_Highlight] forced-colors:data-[highlighted]:[outline-offset:-2px]" />}</EmojiPicker.List.Items>
            </EmojiPicker.List.Section>
          )}
        </EmojiPicker.List>
        <EmojiPicker.Empty className="py-10 text-center text-sm text-picker-muted">No emoji found.</EmojiPicker.Empty>
      </EmojiPicker.Viewport>
      <EmojiPicker.CategoryNav className="flex justify-between border-t border-picker-border px-2 py-1.5">
        {() => <EmojiPicker.CategoryNav.Tab className="flex size-8 items-center justify-center rounded-md text-picker-subtle hover:bg-picker-hover data-active:bg-picker-selected data-active:text-picker-foreground" />}
      </EmojiPicker.CategoryNav>
    </EmojiPicker.Root>
  );
}
