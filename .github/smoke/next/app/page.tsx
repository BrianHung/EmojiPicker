import { EmojiPickerList, EmojiPickerRoot, EmojiPickerSearch, EmojiPickerSearchInput, EmojiPickerSkinTone, EmojiPickerViewport, EmojiProvider } from "@brianhung/emoji-picker-react";
import { Picker } from "./picker";

export default function Page() {
  return (
    <EmojiProvider>
      <Picker />
      <EmojiPickerRoot>
        <EmojiPickerSearch>
          <EmojiPickerSearchInput />
          <EmojiPickerSkinTone />
        </EmojiPickerSearch>
        <EmojiPickerViewport>
          <EmojiPickerList />
        </EmojiPickerViewport>
      </EmojiPickerRoot>
    </EmojiProvider>
  );
}
