import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import en from "@brianhung/emoji-picker-core/data/en.json";
import type { Dataset } from "@brianhung/emoji-picker-core";
import { EmojiPicker, EmojiProvider } from "../../index";

describe("server rendering", () => {
  it("renders the grid, not Loading, for an in-memory dataset", () => {
    const html = renderToString(
      <EmojiProvider data={en as unknown as Dataset} prepare={false}>
        <EmojiPicker.Root>
          <EmojiPicker.Viewport>
            <EmojiPicker.Loading>Loading</EmojiPicker.Loading>
            <EmojiPicker.List />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    expect(html).not.toContain("Loading");
    expect(html).toMatch(/role="(grid|listbox)"/);
  });
});
