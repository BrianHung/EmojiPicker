// An <input> or <textarea> with `:shortcode` typeahead: its text, and inserting at the caret (from a picker).
// Uncontrolled, with the text mirrored in state: a controlled field would be reset by the typeahead's own input listener.
import * as React from "react";
import { useTextFieldEmojiTypeahead, type EmojiTypeaheadOptions } from "@brianhung/emoji-picker";

export function useEmojiTextField<T extends HTMLInputElement | HTMLTextAreaElement>(options?: EmojiTypeaheadOptions) {
  const ref = React.useRef<T>(null);
  const [value, setValue] = React.useState("");
  const emoji = useTextFieldEmojiTypeahead(ref, options);
  const setText = (next: string, at = next.length) => {
    if (ref.current) ref.current.value = next;
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
  return { value, setText, insertAtCaret, emoji, inputProps: { ref, onChange: (e: React.ChangeEvent<T>) => setValue(e.target.value) } };
}
