import { createRoot } from "react-dom/client";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <EmojiPicker onSelect={(selection) => console.log(selection.emoji)}>
    <EmojiPickerSearch />
    <EmojiPickerContent />
    <EmojiPickerFooter />
  </EmojiPicker>,
);
