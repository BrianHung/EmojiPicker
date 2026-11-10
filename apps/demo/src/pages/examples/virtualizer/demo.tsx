import enUrl from "@emoji-components/data/en/iamcal.json?url";
import { EmojiPicker, EmojiProvider } from "emoji-components";
import { usePickedEmoji } from "@/components/site/picked";
import { Card, CardContent } from "@/components/ui/card";
import { EmojiPickerFooter } from "@/registry/emoji-picker";
import { TanStackList } from "./tanstack-list";

export function TanStackPicker() {
  const [, setPicked] = usePickedEmoji();
  return (
    <Card>
      <CardContent className="flex justify-center">
        <EmojiProvider data={enUrl}>
          <EmojiPicker.Root
            onSelect={setPicked}
            className="flex h-[360px] w-[328px] max-w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md [--emoji-picker-cell-size:36px] [--emoji-picker-header-height:28px] [--emoji-picker-emoji-size:24px]"
          >
            <EmojiPicker.Search className="flex h-10 shrink-0 items-center border-b border-border px-3">
              <EmojiPicker.SearchInputGroup>
                <EmojiPicker.SearchInput className="h-full w-full bg-transparent px-0 text-sm outline-none placeholder:text-muted-foreground" />
                <EmojiPicker.SearchClear />
              </EmojiPicker.SearchInputGroup>
            </EmojiPicker.Search>
            <TanStackList />
            <EmojiPickerFooter />
          </EmojiPicker.Root>
        </EmojiProvider>
      </CardContent>
    </Card>
  );
}
