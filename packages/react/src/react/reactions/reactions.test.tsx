// @vitest-environment jsdom
import * as React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@brianhung/emoji-picker-core/data/en.json";
import type { Dataset } from "@brianhung/emoji-picker-core";
import { EmojiPicker, EmojiProvider } from "../../index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.assign(HTMLCanvasElement.prototype, { getContext: () => null });

let unmount = () => {};
afterEach(() => unmount());

function mount(children: React.ReactNode) {
  unmount();
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  React.act(() =>
    root.render(
      <EmojiProvider data={en as unknown as Dataset} prepare={false} storage={{ skinTone: null }}>
        <EmojiPicker.Root reactions={["1f44d", "2764-fe0f"]}>{children}</EmojiPicker.Root>
      </EmojiProvider>,
    ),
  );
  unmount = () => React.act(() => root.unmount());
  return host;
}

describe("Reactions", () => {
  it("presses the selected reactions in any skin tone", () => {
    const host = mount(<EmojiPicker.Reactions selected={["1f44d-1f3fd"]} />);
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
    unmount();
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    await React.act(async () =>
      root.render(
        <EmojiPicker.Root reactions={3}>
          <EmojiPicker.Reactions />
        </EmojiPicker.Root>,
      ),
    );
    unmount = () => React.act(() => root.unmount());
    await vi.waitFor(() => expect(document.querySelectorAll('[data-slot="emoji-picker-reactions"] [data-unified]')).toHaveLength(3));
    vi.unstubAllGlobals();
  });
});
