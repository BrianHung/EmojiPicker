import { EmojiProvider } from "@brianhung/emoji-picker-react";
import { Picker } from "./picker";

export default function Page() {
  return (
    <EmojiProvider>
      <Picker />
    </EmojiProvider>
  );
}
