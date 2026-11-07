import { EmojiPicker, EmojiPickerSearchInput, EmojiProvider } from "@brianhung/emoji-picker-react";
import { EmojiPopoverPopup, EmojiPopoverPortal, EmojiPopoverPositioner, EmojiPopoverRoot, EmojiPopoverTrigger } from "@brianhung/emoji-picker-react/floating-ui";
import { Picker } from "./picker";

export default function Page() {
  return (
    <EmojiProvider>
      <Picker />
      <EmojiPicker.Root>
        <EmojiPicker.Search>
          <EmojiPickerSearchInput />
          <EmojiPicker.SkinTone />
        </EmojiPicker.Search>
        <EmojiPicker.Viewport>
          <EmojiPicker.List />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
      <EmojiPopoverRoot>
        <EmojiPopoverTrigger>Open</EmojiPopoverTrigger>
        <EmojiPopoverPortal>
          <EmojiPopoverPositioner>
            <EmojiPopoverPopup>
              <EmojiPicker.Root>
                <EmojiPicker.Viewport>
                  <EmojiPicker.List />
                </EmojiPicker.Viewport>
              </EmojiPicker.Root>
            </EmojiPopoverPopup>
          </EmojiPopoverPositioner>
        </EmojiPopoverPortal>
      </EmojiPopoverRoot>
    </EmojiProvider>
  );
}
