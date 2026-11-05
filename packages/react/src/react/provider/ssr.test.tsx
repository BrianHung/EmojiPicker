import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import en from "@brianhung/emoji-picker-core/data/en.json";
import type { Dataset } from "@brianhung/emoji-picker-core";
import { Emoji, EmojiPicker, EmojiProvider } from "../../index";

describe("server rendering", () => {
  it("renders the grid, not the loading state, for an in-memory dataset", () => {
    const html = renderToString(
      <EmojiProvider data={en as unknown as Dataset} prepare={false}>
        <EmojiPicker.Root>
          <EmojiPicker.Viewport>
            <EmojiPicker.List renderEmptyState={({ status }) => status} />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    expect(html).not.toContain("loading");
    expect(html).toMatch(/role="(grid|listbox)"/);
  });

  it("renders the empty state for a search with no results", () => {
    const html = renderToString(
      <EmojiProvider data={en as unknown as Dataset} prepare={false}>
        <EmojiPicker.Root defaultQuery="qqzzxx">
          <EmojiPicker.Viewport>
            <EmojiPicker.List renderEmptyState={({ status, query }) => `${status}: ${query}`} />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    expect(html).toContain("empty: qqzzxx");
  });

  it("draws every emoji from imageUrl with the image renderer", () => {
    const html = renderToString(
      <EmojiProvider data={en as unknown as Dataset} prepare={false} renderer="image" imageUrl={(u) => `/apple/${u}.png`}>
        <Emoji emoji="❤️" />
      </EmojiProvider>,
    );
    expect(html).toContain('src="/apple/2764-fe0f.png"');
  });

  it("draws particular emoji from imageUrl under the native renderer", () => {
    const html = renderToString(
      <EmojiProvider data={en as unknown as Dataset} prepare={false} renderer="native" imageUrl={(u) => (u === "2764-fe0f" ? "/heart.png" : undefined)}>
        <Emoji emoji="❤️" />
        <Emoji emoji="👍" />
      </EmojiProvider>,
    );
    expect(html).toContain('src="/heart.png"');
    expect(html).toContain("👍");
  });

  it("gives a Root without a provider its own, loading the default data", () => {
    const html = renderToString(
      <EmojiPicker.Root>
        <EmojiPicker.Viewport>
          <EmojiPicker.List renderEmptyState={({ status }) => status} />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>,
    );
    expect(html).toContain("loading");
  });
});
