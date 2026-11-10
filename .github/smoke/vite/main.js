import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { EmojiPicker } from "emoji-components";

createRoot(document.getElementById("root")).render(h(EmojiPicker.Root, null, h(EmojiPicker.Search), h(EmojiPicker.Viewport, null, h(EmojiPicker.List))));
