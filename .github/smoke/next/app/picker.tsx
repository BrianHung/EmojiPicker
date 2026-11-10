"use client";

import { EmojiPicker } from "emoji-components";

export function Picker() {
  return (
    <EmojiPicker.Root onSelect={(selection) => console.log(selection.emoji)}>
      <EmojiPicker.Search>
        <EmojiPicker.SearchInput />
        <EmojiPicker.SearchClear />
      </EmojiPicker.Search>
      <EmojiPicker.SkinTone />
      <EmojiPicker.Viewport>
        <EmojiPicker.List
          renderEmptyState={({ status, retry }) =>
            status === "loading" ? (
              "Loading…"
            ) : status === "error" ? (
              <button type="button" onClick={retry}>
                Could not load emoji. Try again
              </button>
            ) : (
              "No emoji found."
            )
          }
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}
