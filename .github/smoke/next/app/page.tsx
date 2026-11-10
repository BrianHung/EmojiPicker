import { EmojiPicker, EmojiProvider } from "emoji-components";
import { Picker } from "./picker";

export default function Page() {
  return (
    <EmojiProvider>
      <Picker />
      <EmojiPicker.Root>
        <EmojiPicker.Search>
          <EmojiPicker.SearchInput />
          <EmojiPicker.SearchClear />
        </EmojiPicker.Search>
        <EmojiPicker.SkinTone />
        <EmojiPicker.Viewport>
          <EmojiPicker.List />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
      <EmojiPicker.Root>
        <EmojiPicker.Search />
        <EmojiPicker.Viewport />
      </EmojiPicker.Root>
    </EmojiProvider>
  );
}
