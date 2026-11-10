// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { createTestRoot, render } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider, useEmojiPickerGrid } from "../..";

function mount(children: React.ReactNode) {
  const host = render(
    <EmojiProvider data={en} prepare={false}>
      <EmojiPicker.Root reactions={["1f44d", "2764-fe0f"]}>{children}</EmojiPicker.Root>
    </EmojiProvider>,
  );
  return host;
}

describe("Reactions", () => {
  it("presses the selected reactions in any skin tone", () => {
    const host = mount(<EmojiPicker.Reactions defaultValue={["1f44d-1f3fd"]} />);
    expect([...host.querySelectorAll("[data-unified]")].map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
  });

  it("offers Expand only while a Panel is there to expand into", () => {
    expect(mount(<EmojiPicker.Reactions />).querySelector('[data-slot="emoji-picker-reactions-expand"]')).toBeNull();
    const host = mount(
      <>
        <EmojiPicker.Reactions />
        <EmojiPicker.Panel />
      </>,
    );
    expect(host.querySelector('[data-slot="emoji-picker-reactions-expand"]')).not.toBeNull();
  });

  it("shows the most frequently used emoji without a provider above Root", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify(en)));
    const root = createTestRoot(document.body.appendChild(document.createElement("div")));
    await React.act(async () =>
      root.render(
        <EmojiPicker.Root reactions={3}>
          <EmojiPicker.Reactions />
        </EmojiPicker.Root>,
      ),
    );
    await vi.waitFor(() => expect(document.querySelectorAll('[data-slot="emoji-picker-reactions"] [data-unified]')).toHaveLength(3));
    vi.unstubAllGlobals();
  });

  it("reports whether a press added or removed a reaction, and picks only an added one", () => {
    const changes: [readonly string[], boolean][] = [];
    const picked: string[] = [];
    render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root reactions={["1f44d", "2764-fe0f"]} onSelect={(s) => picked.push(s.unified)}>
          <EmojiPicker.Reactions defaultValue={["1f44d"]} onValueChange={(value, details) => changes.push([value, details.pressed])} />
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    const [thumbs, heart] = document.querySelectorAll<HTMLButtonElement>("[data-unified]");
    React.act(() => heart!.click());
    React.act(() => thumbs!.click());
    expect(changes).toEqual([
      [["1f44d", "2764-fe0f"], true],
      [["2764-fe0f"], false],
    ]);
    expect(picked).toEqual(["2764-fe0f"]);
  });

  it("clears the search when a pick collapses the picker to its reaction row", () => {
    function Grid() {
      return <div {...useEmojiPickerGrid({ rowHeight: 40, columns: 8 }).getGridProps()} />;
    }
    const actions = React.createRef<EmojiPicker.Root.Actions>();
    const host = render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root reactions={["1f44d"]} defaultReactionsOpen={false} defaultQuery="rocket" actionsRef={actions} onSelect={(_, { collapse }) => collapse?.()}>
          <EmojiPicker.Reactions />
          <EmojiPicker.Panel>
            <EmojiPicker.SearchInput />
            <Grid />
          </EmojiPicker.Panel>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    React.act(() => actions.current!.highlight("1f680"));
    React.act(() => void actions.current!.pick());
    expect(host.querySelector("input")!.value).toBe("");
  });
});
