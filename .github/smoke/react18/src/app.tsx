import type { Dataset } from "@emoji-components/core";
import ja from "@emoji-components/data/ja/cldr.json";
import { EmojiPicker, EmojiProvider } from "emoji-components";

const data: Dataset = ja;

export function App() {
  return (
    <EmojiProvider data={data} locale="ja">
      <EmojiPicker.Root onSelect={(selection) => console.log(selection.emoji)}>
        <EmojiPicker.Search>
          <EmojiPicker.SearchInput />
          <EmojiPicker.SkinTone />
        </EmojiPicker.Search>
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
    </EmojiProvider>
  );
}
