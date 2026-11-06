import { EmojiPickerList, EmojiPickerRoot, EmojiPickerSearch, EmojiPickerViewport, EmojiProvider } from "@brianhung/emoji-picker-react";
import { Picker } from "./picker";

export default function Page() {
  return (
    <EmojiProvider>
      <Picker />
      <EmojiPickerRoot>
        <EmojiPickerSearch />
        <EmojiPickerViewport>
          <EmojiPickerList />
        </EmojiPickerViewport>
      </EmojiPickerRoot>
    </EmojiProvider>
  );
}
