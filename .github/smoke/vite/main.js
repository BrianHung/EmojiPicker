import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { EmojiPicker } from "@brianhung/emoji-picker-react";

createRoot(document.getElementById("root")).render(h(EmojiPicker.Root, null, h(EmojiPicker.Search, null, h(EmojiPicker.SearchInput)), h(EmojiPicker.Viewport, null, h(EmojiPicker.List))));
