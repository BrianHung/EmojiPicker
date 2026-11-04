import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiPicker, EmojiProvider } from "@brianhung/emoji-picker";
import { usePickedEmoji } from "@/components/site/picked";
import { Card, CardContent } from "@/components/ui/card";
import { EmojiPickerFooter } from "@/registry/emoji-picker";
import { TanStackList } from "./tanstack-list";

/** The registry card's search and footer around a TanStack Virtual grid. */
export function TanStackPicker() {
  const [, setPicked] = usePickedEmoji();
  return (
    <Card>
      <CardContent className="flex justify-center">
        <EmojiProvider data={enUrl}>
          <EmojiPicker.Root
            onSelect={setPicked}
            className="flex h-[360px] w-[328px] max-w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md [--emoji-cell-size:36px] [--emoji-header-height:28px] [--emoji-size:24px]"
          >
            <EmojiPicker.Search className="flex h-10 shrink-0 items-center border-b border-border px-3" inputProps={{ className: "h-full w-full bg-transparent px-0 text-sm outline-none placeholder:text-muted-foreground" }} />
            <TanStackList />
            <EmojiPickerFooter />
          </EmojiPicker.Root>
        </EmojiProvider>
      </CardContent>
    </Card>
  );
}
