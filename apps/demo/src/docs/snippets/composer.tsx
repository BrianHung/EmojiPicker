"use client";

import * as React from "react";
import { useTextFieldEmojiTypeahead } from "emoji-components";
import { EmojiSuggestions } from "@/components/ui/emoji-suggestions";

export function Composer() {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  const typeahead = useTextFieldEmojiTypeahead(ref);
  return (
    <>
      <textarea ref={ref} aria-label="Message" value={value} onChange={(e) => setValue(e.target.value)} />
      <EmojiSuggestions {...typeahead} />
    </>
  );
}
