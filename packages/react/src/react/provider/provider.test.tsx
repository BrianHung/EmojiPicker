// @vitest-environment jsdom
import * as React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@brianhung/emoji-picker-core/data/en.json";
import type { Dataset } from "@brianhung/emoji-picker-core";
import { EmojiPicker, EmojiProvider, useEmojiStatus, useSkinTone } from "../../index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.assign(HTMLCanvasElement.prototype, { getContext: () => null });

const data = en as unknown as Dataset;

let cleanup = () => {};
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  localStorage.clear();
});

function mount(node: React.ReactNode) {
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  React.act(() => root.render(node));
  cleanup = () => React.act(() => root.unmount());
}

describe("EmojiProvider", () => {
  it("hydrates without mismatch when a skin tone is stored", async () => {
    function Tone() {
      const [tone] = useSkinTone();
      return <span>tone {tone}</span>;
    }
    const app = () => (
      <EmojiProvider data={data} prepare={false}>
        <Tone />
      </EmojiProvider>
    );
    const html = renderToString(app());
    expect(html).toContain("tone <!-- -->0");
    localStorage.setItem("emoji-picker:skin-tone", "3");
    const host = document.body.appendChild(document.createElement("div"));
    host.innerHTML = html;
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let root!: ReturnType<typeof hydrateRoot>;
    await React.act(async () => {
      root = hydrateRoot(host, app(), { onRecoverableError: (e) => errors.push(e) });
    });
    cleanup = () => React.act(() => root.unmount());
    spy.mockRestore();
    expect(errors).toEqual([]);
    expect(host.textContent).toBe("tone 3");
  });

  it("loads once when the provider re-renders with an inline data loader", async () => {
    const calls = vi.fn();
    let bump = () => {};
    function Status({ n }: { n: number }) {
      return (
        <span>
          {useEmojiStatus()} {n}
        </span>
      );
    }
    function App() {
      const [n, setN] = React.useState(0);
      bump = () => setN((x) => x + 1);
      return (
        <EmojiProvider
          prepare={false}
          storage={{ frequents: null, skinTone: null }}
          data={async () => {
            calls();
            return data;
          }}
        >
          <Status n={n} />
        </EmojiProvider>
      );
    }
    mount(<App />);
    await React.act(async () => {});
    for (let i = 0; i < 3; i++) await React.act(async () => bump());
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("keeps children mounted when locale goes from undefined to a value", async () => {
    const mounts = vi.fn();
    function Child() {
      React.useEffect(() => void mounts(), []);
      return null;
    }
    let setLocale = (_: string | undefined) => {};
    function App() {
      const [locale, set] = React.useState<string | undefined>(undefined);
      setLocale = set;
      return (
        <EmojiProvider data={data} prepare={false} locale={locale} storage={{ frequents: null, skinTone: null }}>
          <Child />
        </EmojiProvider>
      );
    }
    mount(<App />);
    await React.act(async () => setLocale("de"));
    expect(mounts).toHaveBeenCalledTimes(1);
  });

  it("shares one store between parts outside every provider", () => {
    function Tone() {
      const [tone, setTone] = useSkinTone();
      return (
        <button type="button" onClick={() => setTone(4)}>
          {tone}
        </button>
      );
    }
    mount(
      <>
        <Tone />
        <EmojiPicker.Root>
          <EmojiPicker.SkinTone />
        </EmojiPicker.Root>
      </>,
    );
    React.act(() => document.querySelector("button")!.click());
    expect(document.querySelector('[data-slot="emoji-picker-skin-tone-trigger"]')?.getAttribute("aria-label")).toBe("Medium-dark skin tone");
  });
});
