import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { en } from "../../../test/en";
import { Emoji, EmojiPicker, EmojiProvider, useEmojiLabels } from "../../index";

function Labels() {
  const labels = useEmojiLabels();
  return `${labels.searchClear}, ${labels.resultCount(1234)}`;
}

describe("server rendering", () => {
  it("gives custom parts the provider's localized labels", () => {
    const html = renderToString(
      <EmojiProvider data={en} prepare={false} locale="de" labels={{ searchClear: "Leeren" }}>
        <Labels />
      </EmojiProvider>,
    );
    expect(html).toBe("Leeren, 1,234 results");
  });

  it("renders the grid, not the loading state, for an in-memory dataset", () => {
    const html = renderToString(
      <EmojiProvider data={en} prepare={false}>
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
      <EmojiProvider data={en} prepare={false}>
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
      <EmojiProvider data={en} prepare={false} renderer="image" imageUrl={(u) => `/apple/${u}.png`}>
        <Emoji emoji="❤️" />
      </EmojiProvider>,
    );
    expect(html).toContain('src="/apple/2764-fe0f.png"');
  });

  it("draws particular emoji from imageUrl under the native renderer", () => {
    const html = renderToString(
      <EmojiProvider data={en} prepare={false} renderer="native" imageUrl={(u) => (u === "2764-fe0f" ? "/heart.png" : undefined)}>
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
