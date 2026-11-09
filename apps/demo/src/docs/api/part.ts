import type { EmojiPicker } from "emoji-components";
import { rowsOf } from "./rows";

export const part = rowsOf<Pick<EmojiPicker.Search.Props, "render" | "className" | "style">>()([
  { name: "render", type: "ReactElement | (props, state) => ReactElement", description: "Replaces the part's element. Its props and ref merge with the part's." },
  { name: "className", type: "string | (state) => string | undefined", description: "A class, or a function of the part's state that returns one." },
  { name: "style", type: "CSSProperties | (state) => CSSProperties | undefined", description: "A style object, or a function of the part's state that returns one." },
]);
