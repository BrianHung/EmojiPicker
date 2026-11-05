import * as React from "react";
import { useTextFieldEmojiTypeahead, type EmojiTypeaheadOptions } from "@brianhung/emoji-picker";

export function useEmojiTextField<T extends HTMLInputElement | HTMLTextAreaElement>(options?: EmojiTypeaheadOptions) {
  const ref = React.useRef<T>(null);
  const [value, setValue] = React.useState("");
  const emoji = useTextFieldEmojiTypeahead(ref, options);
  const setText = (next: string, at = next.length) => {
    setValue(next);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(at, at);
    });
  };
  const insertAtCaret = (text: string) => {
    const from = ref.current?.selectionStart ?? value.length;
    setText(value.slice(0, from) + text + value.slice(ref.current?.selectionEnd ?? from), from + text.length);
  };
  return { value, setText, insertAtCaret, emoji, inputProps: { ref, value, onChange: (e: React.ChangeEvent<T>) => setValue(e.target.value) } };
}
