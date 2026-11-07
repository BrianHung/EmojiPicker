// @vitest-environment jsdom
import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { render, trackRoot } from "../../../test/render";
import { en } from "../../../test/en";
import { Emoji, EmojiPicker, EmojiProvider, useEmojiStatus, useSkinTone } from "../../index";

const fallback = vi.hoisted(() => ({ images: false }));
vi.mock("@brianhung/emoji-picker-core/native", async (original) => ({ ...(await original<typeof import("@brianhung/emoji-picker-core/native")>()), needsImageFallback: () => fallback.images }));

function mount(node: React.ReactNode) {
  render(node);
}

describe("EmojiProvider", () => {
  it("hydrates without mismatch when a skin tone is stored", async () => {
    function Tone() {
      const [tone] = useSkinTone();
      return <span>tone {tone}</span>;
    }
    const app = () => (
      <EmojiProvider data={en} prepare={false}>
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
    await React.act(async () => {
      trackRoot(hydrateRoot(host, app(), { onRecoverableError: (e) => errors.push(e) }));
    });
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
          data={async () => {
            calls();
            return en;
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
        <EmojiProvider data={en} prepare={false} locale={locale}>
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

  it("draws images outside every provider where the system cannot draw emoji, as a Root does", () => {
    fallback.images = true;
    mount(<Emoji emoji="🇺🇸" />);
    fallback.images = false;
    expect(document.querySelector("img[data-emoji]")?.getAttribute("src")).toContain("1f1fa-1f1f8");
  });

  it("drops an aria-hidden Emoji's role and name, and forwards its ref", () => {
    const ref = React.createRef<HTMLElement>();
    mount(
      <EmojiProvider data={en} prepare={false}>
        <Emoji ref={ref} emoji="1f600" aria-hidden />
      </EmojiProvider>,
    );
    const el = document.querySelector('[data-slot="emoji"]')!;
    expect([ref.current === el, el.getAttribute("aria-hidden"), el.getAttribute("role"), el.getAttribute("aria-label")]).toEqual([true, "true", null, null]);
  });
});
