// @vitest-environment jsdom
import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createTestRoot, render } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider, useEmojiPickerReactions } from "../..";

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

  it("renders the row and its Expand on the server, before the data loads", () => {
    const html = renderToString(
      <EmojiProvider data={async () => en}>
        <EmojiPicker.Root reactions={["1f44d", "2764-fe0f"]}>
          <EmojiPicker.Reactions />
          <EmojiPicker.Panel />
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    expect(html.match(/data-slot="emoji-picker-reactions-(item|expand)"/g)).toEqual(["emoji-picker-reactions-item", "emoji-picker-reactions-item", "emoji-picker-reactions-expand"].map((s) => `data-slot="${s}"`));
  });

  it("returns focus to Expand when a pick collapses the Panel", () => {
    const actions = React.createRef<EmojiPicker.Root.Actions>();
    const host = render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root reactions={["1f44d", "2764-fe0f"]} actionsRef={actions}>
          <EmojiPicker.Reactions />
          <EmojiPicker.Panel>
            <input aria-label="Search" />
          </EmojiPicker.Panel>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    const expand = host.querySelector<HTMLButtonElement>('[data-slot="emoji-picker-reactions-expand"]')!;
    React.act(() => expand.click());
    React.act(() => host.querySelector("input")!.focus());
    React.act(() => void actions.current!.pick("1f680"));
    expect(document.activeElement?.getAttribute("data-slot")).toBe("emoji-picker-reactions-expand");
  });

  it("shows the most frequently used emoji without a provider above Root", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify(en)));
    const recent = { count: 1, lastUsed: Date.now() };
    localStorage.setItem("emoji-components:frequents", JSON.stringify({ "1f44d": recent, "2764-fe0f": recent, "1f525": recent }));
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

  it("toggles a custom row built on useEmojiPickerReactions, a toolbar the arrows move through", () => {
    function Row() {
      const { reactions, getToolbarProps, getItemProps } = useEmojiPickerReactions({ defaultValue: ["1f44d"] });
      return (
        <div {...getToolbarProps()}>
          {reactions.map((emoji) => (
            <button key={emoji} {...getItemProps(emoji)} />
          ))}
        </div>
      );
    }
    const host = mount(<Row />);
    const buttons = host.querySelectorAll("button");
    const pressed = () => [...buttons].map((b) => b.getAttribute("aria-pressed"));
    expect(pressed()).toEqual(["true", "false"]);
    React.act(() => buttons[1]!.click());
    expect(pressed()).toEqual(["true", "true"]);
    expect(host.querySelector('[role="toolbar"]')?.getAttribute("aria-label")).toBe("Reactions");
    React.act(() => buttons[0]!.focus());
    React.act(() => void buttons[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(buttons[1]);
    React.act(() => void buttons[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(buttons[0]);
  });
});
