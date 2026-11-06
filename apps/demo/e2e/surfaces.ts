import type { Locator, Page } from "@playwright/test";
import { hold, quiet, slot, SLOTS, type Viewport, visit } from "./support";

export type Kind = "picker" | "menu" | "bar";

export type Surface = {
  id: string;
  path: string;
  kind: Kind;
  only?: Viewport;
  prepare?: (page: Page) => Promise<void>;
  trigger?: (page: Page) => Locator;
  open: (page: Page) => Promise<Locator>;
  root: (page: Page) => Locator;
  field?: (page: Page) => Locator;
  frame?: (page: Page) => Locator;
  inline?: boolean;
};

const layer = (page: Page) =>
  page
    .locator(`${slot("popoverContent")}, [data-slot="drawer-popup"]`)
    .filter({ visible: true })
    .last();
export const listbox = (page: Page) =>
  page
    .getByRole("listbox")
    .filter({ visible: true })
    .and(page.locator(`:not(${slot("list")}), ${slot("suggestions")} ${slot("list")}`))
    .last();
export const pickerIn = (scope: Locator) => scope.locator(`xpath=descendant-or-self::*[@data-slot="${SLOTS.root}" or @data-epr-part="root"]`).first();
export const firstPicker = (page: Page) => page.locator(slot("root")).first();
const button = (scope: Page | Locator, name: string) => scope.getByRole("button", { name, exact: true });

export const card = (page: Page, title?: string) => (title ? page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: title, exact: true }) }) : page.locator('[data-slot="card"]').first());
export const example = (page: Page, id: string) => page.locator(`section:has(> h3#${id})`);
export const preview = (page: Page, id: string) => example(page, id).locator("div.relative").first();
export const homePopover = (page: Page) => button(example(page, "popover"), "Open emoji picker");
const hero = (page: Page) => page.getByRole("tablist", { name: "App" }).locator("xpath=../following-sibling::div[1]");

type Extra = Partial<Omit<Surface, "id" | "path" | "kind" | "open">>;

function popover(id: string, path: string, trigger: (p: Page) => Locator, extra: Extra = {}): Surface {
  return {
    id,
    path,
    kind: "picker",
    root: layer,
    trigger,
    open: async (p) => {
      await trigger(p).click();
      if (extra.root) await extra.root(p).waitFor();
      else
        await layer(p)
          .locator(`${slot("emoji")}, ${slot("searchInput")}`)
          .first()
          .waitFor();
      await p.mouse.move(0, 0);
      await quiet(p);
      await p.evaluate(() => window.dispatchEvent(new Event("resize")));
      await quiet(p);
      return trigger(p);
    },
    ...extra,
  };
}

export const caretToEnd = (field: Locator) =>
  field.evaluate((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.setSelectionRange(el.value.length, el.value.length);
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });

export async function clearTextField(field: Locator) {
  if (await field.evaluate((el) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) await field.fill("");
}

function menu(id: string, path: string, field: (p: Page) => Locator, text: string, extra: Extra = {}): Surface {
  return {
    id,
    path,
    kind: "menu",
    root: listbox,
    field,
    open: async (p) => {
      await field(p).click();
      await clearTextField(field(p));
      await caretToEnd(field(p));
      await p.keyboard.type(text, { delay: 40 });
      await listbox(p).getByRole("option").first().waitFor();
      return field(p);
    },
    ...extra,
  };
}

export const tiptapField = (p: Page) => p.locator("main [contenteditable=true]").first();
export const lexicalField = (p: Page) => p.getByLabel("Editor", { exact: true });

export type Editor = { name: string; path: string; field: (p: Page) => Locator; trigger: string; gap?: number };

export const EDITORS: Editor[] = [
  { name: "Tiptap", path: "/examples/tiptap/", field: tiptapField, trigger: ":smi" },
  { name: "Lexical", path: "/examples/lexical/", field: lexicalField, trigger: ":smi" },
  { name: "Textarea (Slack)", path: "/gallery/#slack", field: (p) => card(p).getByLabel("Message #general", { exact: true }), trigger: ":smi" },
  { name: "Grid menu (Notion)", path: "/gallery/#notion", field: (p) => card(p).getByLabel("Page content", { exact: true }), trigger: ":sm", gap: 64 },
];

export async function openEditorMenu(page: Page, e: Editor, trigger = e.trigger) {
  await visit(page, e.path);
  return menu(e.name, e.path, e.field, trigger).open(page);
}

export const fieldText = (field: Locator) =>
  field.evaluate((el) => (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : (el as HTMLElement).isContentEditable ? el.textContent : null), null, { timeout: 500 }).catch(() => null);

function inline(id: string, path: string, scope: (p: Page) => Locator, extra: Extra = {}): Surface {
  return {
    id,
    path,
    kind: "picker",
    inline: true,
    root: (p) => pickerIn(scope(p)),
    frame: scope,
    open: async (p) => {
      const root = pickerIn(scope(p));
      const search = root.locator(slot("searchInput"));
      const target = (await search.count()) ? search.first() : root.locator(slot("emoji")).first();
      await target.click();
      return target;
    },
    ...extra,
  };
}

const tab = (name: string) => async (p: Page) => {
  await p.getByRole("tab", { name, exact: true }).first().click();
};

export const STYLES = ["apple", "slack", "discord", "notion", "linear", "instagram"] as const;
type StyleId = (typeof STYLES)[number];
const LABEL: Record<StyleId, string> = { apple: "Apple", slack: "Slack", discord: "Discord", notion: "Notion", linear: "Linear", instagram: "Instagram" };

async function dismissTapback(p: Page) {
  const dim = card(p).locator("div.absolute.inset-0.z-20");
  await dim.waitFor();
  await dim.dispatchEvent("pointerdown", { bubbles: true, isPrimary: true });
  await dim.waitFor({ state: "detached" });
}

function scene(s: StyleId): Surface[] {
  const path = `/gallery/#${s}`;
  const id = (name: string) => `gallery/${s}/scene-${name}`;
  const sc = (p: Page) => card(p);
  const shotCard = { frame: sc };
  switch (s) {
    case "apple":
      return [
        popover(id("tapback-more"), path, (p) => sc(p).getByRole("toolbar", { name: "Tapbacks" }).getByRole("button", { name: "More emoji" })),
        popover(id("composer"), path, (p) => button(sc(p), "Emoji"), { prepare: dismissTapback }),
        menu(id("autocomplete"), path, (p) => sc(p).getByLabel("Message", { exact: true }), ":smi", { prepare: dismissTapback, ...shotCard }),
      ];
    case "slack":
      return [
        popover(id("reaction"), path, (p) =>
          button(
            sc(p)
              .locator("div.group")
              .filter({ hasText: /^Priya/ }),
            "Add reaction",
          ).first(),
        ),
        popover(id("composer"), path, (p) => button(sc(p), "Emoji")),
        menu(id("autocomplete"), path, (p) => sc(p).getByLabel("Message #general", { exact: true }), ":smi", shotCard),
      ];
    case "discord":
      return [
        popover(id("reaction"), path, (p) => button(sc(p), "eyes, 2 reactions").locator("xpath=..").getByRole("button", { name: "Add Reaction" })),
        popover(id("composer"), path, (p) => button(sc(p), "Select emoji")),
        menu(id("autocomplete"), path, (p) => sc(p).getByLabel("Message #general", { exact: true }), ":smi", shotCard),
      ];
    case "notion":
      return [popover(id("page-icon"), path, (p) => button(sc(p), "Change icon")), menu(id("colon-menu"), path, (p) => sc(p).getByLabel("Page content", { exact: true }), ":sm", shotCard)];
    case "linear":
      return [
        popover(id("issue-icon"), path, (p) => button(sc(p), "Change issue icon")),
        popover(id("reaction"), path, (p) => button(sc(p), "Add reaction").first()),
        menu(id("comment-autocomplete"), path, (p) => sc(p).getByLabel("Leave a comment", { exact: true }), ":smi", shotCard),
      ];
    case "instagram": {
      const bar = (p: Page) =>
        p
          .locator(`${slot("popoverContent")}[aria-label="Reactions"], [role="dialog"]:has([aria-label="More reactions"])`)
          .filter({ visible: true })
          .last();
      const react = (p: Page) => button(sc(p).locator("div.group").filter({ hasText: "ok who's in for the lake" }), "React");
      const openBar = async (p: Page) => {
        const message = sc(p).getByRole("button", { name: /^Maya: ok who's in/ });
        if (await message.count()) await hold(p, message, bar(p));
        else await react(p).click();
        await bar(p).waitFor();
      };
      return [
        { id: id("reaction-bar"), path, kind: "bar", root: bar, open: async (p) => (await openBar(p), react(p)) },
        popover(id("reaction-more"), path, (p) => bar(p).getByRole("button", { name: "More reactions" }), { prepare: openBar }),
        popover(id("composer"), path, (p) => button(sc(p), "Choose an emoji")),
      ];
    }
  }
}

function gallery(s: StyleId): Surface[] {
  const path = `/gallery/#${s}`;
  const id = (name: string) => `gallery/${s}/${name}`;
  return [
    ...scene(s),
    inline(id("inline"), path, (p) => card(p, "Inline picker")),
    popover(id("popover"), path, (p) => button(card(p, "Popover"), "Open emoji picker")),
    popover(id("popover-no-search"), path, (p) => button(card(p, "Popover without search"), "Open emoji picker")),
    popover(id("tapback-more"), path, (p) => button(card(p, "Reaction row"), "More emoji")),
    popover(id("reactions-add"), path, (p) => button(card(p, "Reaction counts"), "Add reaction")),
    menu(id("autocomplete"), path, (p) => card(p, "Shortcode typeahead").locator("input"), ":smi", { frame: (p) => card(p, "Shortcode typeahead") }),
    inline(id("sheet"), path, (p) => card(p, "Sheet")),
  ];
}

const home: Surface[] = [
  popover("home/hero-apple-tapback-more", "/", (p) => hero(p).getByRole("toolbar", { name: "Tapbacks" }).getByRole("button", { name: "More emoji" })),
  ...STYLES.filter((s) => s !== "apple").map((s) => inline(`home/hero-${s}`, "/", hero, { prepare: tab(LABEL[s]) })),
  inline("home/inline-tailwind", "/", (p) => preview(p, "inline")),
  inline("home/inline-css-modules", "/", (p) => preview(p, "inline"), { prepare: async (p) => example(p, "inline").getByRole("tab", { name: "CSS Modules" }).click() }),
  popover("home/popover", "/", homePopover),
  {
    id: "home/tapback-more",
    path: "/",
    kind: "picker",
    root: (p) => preview(p, "tapback"),
    trigger: (p) => button(preview(p, "tapback"), "More emoji"),
    open: async (p) => {
      await button(preview(p, "tapback"), "More emoji").click();
      await preview(p, "tapback").locator(slot("searchInput")).waitFor();
      return button(preview(p, "tapback"), "More emoji");
    },
  },
  inline("home/search", "/", (p) => preview(p, "search")),
  inline("home/custom-emoji", "/", (p) => preview(p, "custom-emoji")),
  inline("home/custom-cells", "/", (p) => preview(p, "custom-cells")),
  menu("home/autocomplete", "/", (p) => example(p, "headless").getByLabel("Message", { exact: true }), ":smi", { frame: (p) => preview(p, "headless") }),
];

const examples: Surface[] = [
  menu("examples/tiptap/menu", "/examples/tiptap/", tiptapField, ":smi"),
  popover("examples/tiptap/insert", "/examples/tiptap/", (p) => button(p, "Insert emoji")),
  menu("examples/lexical/menu", "/examples/lexical/", lexicalField, ":smi"),
  popover("examples/lexical/insert", "/examples/lexical/", (p) => button(p, "Insert emoji")),
  inline("examples/custom-emoji", "/examples/custom-emoji/", (p) => p.locator("main").getByRole("complementary").first()),
  inline("examples/semantic-search", "/examples/semantic-search/", (p) => p.locator("main").getByRole("complementary").first(), {
    prepare: async (p) => button(p.locator("main"), "Clear").click(),
  }),
];

export const SURFACES: Surface[] = [...STYLES.flatMap(gallery), ...home, ...examples];

export function surface(id: string): Surface {
  const found = SURFACES.find((s) => s.id === id);
  if (!found) throw new Error(`No surface ${id}`);
  return found;
}

// Opens an inline picker too when `interact` is set: its open() focuses the search field or the first emoji
export async function show(page: Page, s: Surface, { interact = false } = {}) {
  await visit(page, s.path);
  await s.prepare?.(page);
  const back = interact || !s.inline ? await s.open(page) : null;
  await quiet(page);
  return { back, root: s.root(page) };
}

export type Shot = { id: string; path: string; only?: Viewport; prepare?: (page: Page) => Promise<void>; frame: (page: Page) => Locator; mask?: (page: Page) => Locator[] };

const ENGINES = ["lexical()", "No typos", "+ Fuse", "+ Frequents", "Async"];
const searchFor =
  (engine: string, mode = "Ranked") =>
  async (p: Page) => {
    const ex = example(p, "search");
    for (const name of [engine, mode]) {
      await ex.getByRole("tab", { name, exact: true }).focus();
      await p.keyboard.press("Enter");
    }
    await preview(p, "search").locator(slot("searchInput")).fill("smile");
    await preview(p, "search").locator(slot("emoji")).first().waitFor();
  };

export const SHOTS: Shot[] = [
  ...STYLES.flatMap((s): Shot[] => {
    const path = `/gallery/#${s}`;
    return [
      { id: `gallery/${s}/scene`, path, frame: (p) => card(p) },
      { id: `gallery/${s}/tapback`, path, frame: (p) => card(p, "Reaction row") },
      { id: `gallery/${s}/reactions`, path, frame: (p) => card(p, "Reaction counts") },
    ];
  }),
  {
    id: "gallery/slack/scene-tooltip",
    path: "/gallery/#slack",
    only: "desktop",
    prepare: async (p) => {
      await card(p).scrollIntoViewIfNeeded();
      const message = card(p)
        .locator("div.group")
        .filter({ has: p.getByText(/^yep/) });
      await message.hover();
      await message
        .getByRole("button", { name: /^React with/ })
        .first()
        .hover();
      await p.getByRole("tooltip").waitFor();
    },
    frame: (p) => card(p),
  },
  { id: "home/header", path: "/", frame: (p) => p.getByRole("banner") },
  { id: "home/mobile-menu", path: "/", only: "mobile", prepare: async (p) => p.getByRole("button", { name: "Menu" }).click(), frame: (p) => p.getByRole("dialog") },
  { id: "home/hero-apple", path: "/", frame: hero },
  { id: "home/tapback", path: "/", frame: (p) => preview(p, "tapback") },
  { id: "home/rendering", path: "/", frame: (p) => preview(p, "rendering") },
  ...ENGINES.map((e): Shot => ({ id: `home/search-${e.replace(/\W+/g, "").toLowerCase()}`, path: "/", prepare: searchFor(e), frame: (p) => preview(p, "search") })),
  { id: "home/search-grouped", path: "/", prepare: searchFor("lexical()", "Grouped"), frame: (p) => preview(p, "search") },
  { id: "examples/index", path: "/examples/", frame: (p) => p.locator("main") },
  { id: "examples/semantic-search-on-device", path: "/examples/semantic-search/", frame: (p) => p.getByTestId("status").locator("xpath=.."), mask: (p) => [p.getByTestId("status")] },
];
