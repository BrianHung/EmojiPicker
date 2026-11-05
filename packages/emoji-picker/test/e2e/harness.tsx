// Browser fixtures for test/e2e/run.mjs. Loaded into the running demo dev server
// (`/@fs/…/harness.tsx`), so it goes through the same Vite + React setup as the site.
import * as React from "react";
import { createRoot, type Root as ReactRoot } from "react-dom/client";
import enUrl from "../../data/en.json?url";
import { Emoji, EmojiOverrides, EmojiPicker, EmojiPopover, EmojiProvider, Tapback, type ArtworkMap, type CustomEmoji, type CustomEmojiSource, type KeyboardAction } from "../../src/index";
// The demo's shadcn registry item and autocomplete: the markup apps actually ship.
import { useEmojiTextField } from "@/components/emoji-text-field";
import { SuggestionMenu } from "@/components/suggestion-menu";
import { EmojiPickerCard } from "@/registry/emoji-picker";

export type Fixture = {
  kind: "vertical" | "horizontal" | "popover" | "popover-row" | "tapback" | "registry" | "autocomplete";
  dir?: "ltr" | "rtl";
  keymap?: Partial<Record<KeyboardAction, string[]>>;
  /** Generated custom emoji in one "pack" section. */
  customs?: number;
  /** One custom emoji with a very long name and shortcode. */
  longNames?: boolean;
  /** A custom section with exactly one emoji. */
  single?: boolean;
  closeOnSelect?: boolean;
  searchResults?: "ranked" | "grouped";
  /** A large pack served by the test (`/__pack/…`), given as an array, a URL or a loader. */
  pack?: { count: number; as: "array" | "url" | "loader"; animated?: boolean };
  renderer?: "native" | "twemoji";
  /** Tapback: the user's current reactions. */
  selected?: string[];
  /** Leave out the Search part. */
  noSearch?: boolean;
  /** Artwork for everything inside (EmojiOverrides). */
  artwork?: ArtworkMap;
  /** Extra Root props (focusModel, pointer, …). */
  root?: Partial<React.ComponentProps<typeof EmojiPicker.Root>>;
  /** Root's onKeyDown calls preventEmojiPickerHandler() for this key. */
  intercept?: string;
  /** List's onKeyDown calls preventEmojiPickerHandler() for this key. */
  interceptOnList?: string;
};

declare global {
  interface Window {
    __picks: string[];
    __keys: string[];
    __harness: { mount(fixture: Fixture): void; unmount(): void };
  }
}

const IMAGE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#3a3"/></svg>')}`;
export const LONG_NAME = "an extraordinarily long custom emoji name that keeps going well past any sensible width for a footer or a menu";
export const LONG_CODE = "an_extraordinarily_long_custom_emoji_shortcode_that_keeps_going_well_past_any_sensible_width";

export function packEmoji(count: number, animated = false, dir = "loader"): CustomEmoji[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `frog${i}`,
    name: `frog ${i}`,
    imageUrl: `/__pack/${dir}/frog-${i}.${animated ? "gif" : "png"}`,
    ...(animated ? { animated: true, stillUrl: `/__pack/${dir}/frog-${i}-still.png` } : {}),
    shortcodes: [`frog_${i}`],
    group: "frogs",
  }));
}

function sourcesFor(f: Fixture): CustomEmojiSource[] {
  const sources: CustomEmojiSource[] = [customsFor(f)];
  if (f.pack) {
    const { count, as, animated } = f.pack;
    sources.push(as === "url" ? `/__pack/pack.json?count=${count}&animated=${animated ? 1 : 0}` : as === "loader" ? async () => packEmoji(count, animated, "loader") : packEmoji(count, animated, "array"));
  }
  return sources;
}

function customsFor(f: Fixture): CustomEmoji[] {
  const out: CustomEmoji[] = [];
  for (let i = 0; i < (f.customs ?? 0); i++) out.push({ id: `pack-${i}`, name: `pack emoji ${i}`, imageUrl: IMAGE, shortcodes: [`pack_${i}`], group: "pack" });
  if (f.longNames) out.push({ id: "long-one", name: LONG_NAME, imageUrl: IMAGE, shortcodes: [LONG_CODE], group: "long" });
  if (f.single) out.push({ id: "only-one", name: "lonely", imageUrl: IMAGE, shortcodes: ["lonely"], group: "single" });
  return out;
}

const CSS = `
#harness { position: fixed; inset: 16px auto auto 16px; z-index: 9999; background: white; color: black; padding: 8px; font: 13px system-ui; }
#harness .hx-picker { display: flex; flex-direction: column; width: 352px; height: 380px; border: 1px solid #ccc; }
#harness .hx-picker [data-slot="viewport"] { flex: 1; position: relative; }
#harness [data-slot="search-input"] { height: 40px; width: 100%; padding: 0 30px; }
#harness [data-slot="search-clear"] { position: absolute; inset-inline-end: 10px; width: 30px; height: 30px; }
#harness [data-slot="category-nav"] { display: flex; }
#harness [data-slot="category-tab"] { width: 30px; height: 30px; }
#harness [data-slot="category-header"] { display: flex; align-items: center; padding: 0 10px; }
#harness [data-slot="emoji"] { display: flex; align-items: center; justify-content: center; }
#harness [data-slot="skin-tone"] { position: relative; display: inline-flex; }
#harness [data-slot="skin-tone-options"] { inset-block-start: 0; inset-inline-end: 0; z-index: 3; display: flex; }
#harness [data-slot="panel"] { display: flex; flex-direction: column; flex: 1; min-height: 0; }
#harness [data-slot="reactions"] { display: flex; align-items: center; }
#harness [data-slot="emoji"][data-highlighted], #harness [data-slot="emoji"]:focus { background: #ddd; outline: 2px solid #36c; }
#harness .footer { height: 28px; display: flex; gap: 8px; align-items: center; min-width: 0; overflow: hidden; white-space: nowrap; }
#harness .footer .name { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
#harness .footer code { margin-inline-start: auto; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex-shrink: 1; }
.hx-pop { transition: opacity 150ms ease-out, transform 150ms ease-out; transform-origin: var(--transform-origin); background: white; }
.hx-pop[data-starting-style], .hx-pop[data-ending-style] { opacity: 0; transform: scale(0.95); }
`;

function Footer() {
  const active = EmojiPicker.useActiveEmoji();
  return (
    <div className="footer" data-testid="footer">
      <span className="name">{active?.name ?? "Pick an emoji"}</span>
      {active?.shortcodes[0] ? <code>:{active.shortcodes[0]}:</code> : null}
    </div>
  );
}

function Picker({ f, horizontal }: { f: Fixture; horizontal?: boolean }) {
  const groupIds = [...new Set([...customsFor(f), ...(f.pack ? [{ group: "frogs" }] : [])].map((c) => `custom:${c.group}`))];
  return (
    <EmojiPicker.Root
      {...f.root}
      className="hx-picker"
      dir={f.dir}
      keymap={f.keymap}
      searchResults={f.searchResults}
      categories={[{ id: "suggested" }, { id: "smileys_people" }, { id: "animals_nature" }, { id: "food_drink" }, ...groupIds.map((id) => ({ id })), { id: "flags" }]}
      onSelect={(s) => window.__picks.push(s.unified)}
      onKeyDown={(e) => {
        window.__keys.push(`root:${e.key}`);
        if (f.intercept && e.key === f.intercept) e.preventEmojiPickerHandler();
      }}
    >
      {f.noSearch ? null : (
        <EmojiPicker.Search>
          <EmojiPicker.Search.Input />
          <EmojiPicker.SkinTone />
        </EmojiPicker.Search>
      )}
      <EmojiPicker.Viewport style={horizontal ? { flex: "none", height: 260 } : undefined}>
        <EmojiPicker.List
          orientation={horizontal ? "horizontal" : "vertical"}
          rows={5}
          onKeyDown={(e) => {
            window.__keys.push(`list:${e.key}`);
            if (f.interceptOnList && e.key === f.interceptOnList) e.preventEmojiPickerHandler();
          }}
        />
        <EmojiPicker.Empty>No emoji found.</EmojiPicker.Empty>
      </EmojiPicker.Viewport>
      <Footer />
      <Emoji emoji="👍🏽" data-testid="solo" size={20} />
      <EmojiPicker.CategoryNav />
    </EmojiPicker.Root>
  );
}

function Autocomplete() {
  const { emoji, inputProps } = useEmojiTextField<HTMLInputElement>({ insert: "shortcode" });
  return (
    <div style={{ position: "relative", width: 320 }}>
      <SuggestionMenu {...emoji} side="top" />
      <input {...inputProps} aria-label="Message" data-testid="composer" style={{ width: 320 }} />
    </div>
  );
}

function App({ f }: { f: Fixture }) {
  const customs = React.useMemo(() => sourcesFor(f), [f]);
  let body: React.ReactNode;
  if (f.kind === "popover")
    body = (
      <EmojiPopover.Root closeOnSelect={f.closeOnSelect ?? true}>
        <EmojiPopover.Trigger data-testid="trigger">Open</EmojiPopover.Trigger>
        <EmojiPopover.Content className="hx-pop" data-testid="content" duration={150}>
          <Picker f={f} />
        </EmojiPopover.Content>
      </EmojiPopover.Root>
    );
  else if (f.kind === "popover-row")
    // A popover that isn't a picker: a row of buttons (an app's own reaction bar).
    body = (
      <EmojiPopover.Root>
        <EmojiPopover.Trigger data-testid="trigger">React</EmojiPopover.Trigger>
        <EmojiPopover.Content className="hx-pop" data-testid="content">
          <div role="toolbar" aria-label="Reactions">
            <button type="button">👍</button>
            <button type="button">❤️</button>
          </div>
        </EmojiPopover.Content>
        <button type="button" data-testid="after">after</button>
      </EmojiPopover.Root>
    );
  else if (f.kind === "tapback")
    body = (
      <Tapback {...f.root} selected={f.selected} className="hx-picker" onSelect={(s) => window.__picks.push(s.unified)} dir={f.dir} keymap={f.keymap}>
        <EmojiPicker.Reactions />
        <EmojiPicker.Panel>
          <EmojiPicker.Search />
          <EmojiPicker.Viewport>
            <EmojiPicker.List />
          </EmojiPicker.Viewport>
        </EmojiPicker.Panel>
      </Tapback>
    );
  else if (f.kind === "registry") body = <EmojiPickerCard onSelect={(s) => window.__picks.push(s.unified)} />;
  else if (f.kind === "autocomplete") body = <Autocomplete />;
  else body = <Picker f={f} horizontal={f.kind === "horizontal"} />;
  return (
    <EmojiProvider data={enUrl} customEmojis={customs} renderer={f.renderer}>
      <div dir={f.dir}>{f.artwork ? <EmojiOverrides artwork={f.artwork}>{body}</EmojiOverrides> : body}</div>
    </EmojiProvider>
  );
}

let root: ReactRoot | null = null;
window.__harness = {
  mount(fixture) {
    window.__picks = [];
    window.__keys = [];
    this.unmount();
    document.getElementById("harness")?.remove();
    if (!document.getElementById("harness-css")) {
      const style = document.createElement("style");
      style.id = "harness-css";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const host = document.createElement("div");
    host.id = "harness";
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<App f={fixture} />);
  },
  unmount() {
    root?.unmount();
    root = null;
  },
};
