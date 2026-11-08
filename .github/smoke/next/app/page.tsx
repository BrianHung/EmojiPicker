import { EmojiPicker, EmojiProvider } from "@brianhung/emoji-picker-react";
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";
import { Picker } from "./picker";

export default function Page() {
  return (
    <EmojiProvider>
      <Picker />
      <EmojiPicker.Root>
        <EmojiPicker.Search>
          <EmojiPicker.SearchInput />
          <EmojiPicker.SkinTone />
        </EmojiPicker.Search>
        <EmojiPicker.Viewport>
          <EmojiPicker.List />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
      <EmojiPopover.Root>
        <EmojiPopover.Trigger>Open</EmojiPopover.Trigger>
        <EmojiPopover.Portal>
          <EmojiPopover.Positioner>
            <EmojiPopover.Popup>
              <EmojiPicker.Root>
                <EmojiPicker.Viewport>
                  <EmojiPicker.List />
                </EmojiPicker.Viewport>
              </EmojiPicker.Root>
            </EmojiPopover.Popup>
          </EmojiPopover.Positioner>
        </EmojiPopover.Portal>
      </EmojiPopover.Root>
    </EmojiProvider>
  );
}
