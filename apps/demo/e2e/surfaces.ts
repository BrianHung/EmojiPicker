// Every picker surface on the site, in one table: how to reach it, what opens, and what a screenshot
// frames. visual.spec.ts shoots each one (plus the static targets at the bottom); behavior.spec.ts
// drives each with the keyboard. Desktop opens popovers; at phone width the same triggers open sheets.
import type { Locator, Page } from "@playwright/test";
import { hold, quiet, type Viewport } from "./support";

/** picker: an emoji grid (popover, sheet or inline). menu: a `:shortcode` listbox. bar: a reaction bar. */
export type Kind = "picker" | "menu" | "bar";

export type Surface = {
  id: string;
  path: string;
  kind: Kind;
  only?: Viewport;
  /** Gets the page to the surface's starting point (a tab, dismissing an auto-opened tapback). */
  prepare?: (page: Page) => Promise<void>;
  /** The popover's trigger: focus it and press Enter to open from the keyboard. */
  trigger?: (page: Page) => Locator;
  /** Opens it and returns where focus belongs afterwards (the trigger or the text field). Inline: focuses it. */
  open: (page: Page) => Promise<Locator>;
  /** The open surface. */
  root: (page: Page) => Locator;
  /** What its screenshot frames (default: root). */
  frame?: (page: Page) => Locator;
  /** Inline: always on screen, so its screenshot is taken before `open`. */
  inline?: boolean;
};

/* ------------------------------------------------------------------ locators */

/** The topmost open popover or sheet. */
export const layer = (page: Page) => page.locator('[data-slot="popover-content"], [data-slot="drawer-popup"]').filter({ visible: true }).last();
/** A `:` menu (the pickers are listboxes too: `data-slot="list"`). */
const listbox = (page: Page) => page.getByRole("listbox").filter({ visible: true }).and(page.locator(":not([data-slot=list])")).last();
/** The picker root: the scope itself (a page whose frame is the picker) or the first one inside it. */
const pickerIn = (scope: Locator) => scope.locator('xpath=descendant-or-self::*[@data-slot="emoji-picker" or @data-epr-part="root"]').first();
const button = (scope: Page | Locator, name: string) => scope.getByRole("button", { name, exact: true });

/** A gallery card by title; no title is the app scene at the top. */
export const card = (page: Page, title?: string) =>
  title ? page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: title, exact: true }) }) : page.locator('[data-slot="card"]').first();
/** A home-page example section (by its h3 id) and its live preview. */
const example = (page: Page, id: string) => page.locator(`section:has(> h3#${id})`);
export const preview = (page: Page, id: string) => example(page, id).locator("div.relative").first();
export const hero = (page: Page) => page.getByRole("tablist", { name: "App" }).locator("xpath=../following-sibling::div[1]");

/* ------------------------------------------------------------------ builders */

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
      else await layer(p).locator('[data-slot="emoji"], [data-slot="search-input"]').first().waitFor();
      // The popover is placed from the trigger's box while it is pressed/hovered (scaled by its
      // transform transition), so its sub-pixel position depends on timing. Re-place it at rest.
      await p.mouse.move(0, 0);
      await quiet(p);
      await p.evaluate(() => window.dispatchEvent(new Event("resize")));
      await quiet(p);
      return trigger(p);
    },
    ...extra,
  };
}

/** Puts the caret at the end of a field (input, textarea or contenteditable). */
export const caretToEnd = (field: Locator) =>
  field.evaluate((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.setSelectionRange(el.value.length, el.value.length);
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });

function menu(id: string, path: string, field: (p: Page) => Locator, text: string, extra: Extra = {}): Surface {
  return {
    id,
    path,
    kind: "menu",
    root: listbox,
    open: async (p) => {
      await field(p).click();
      await caretToEnd(field(p));
      await p.keyboard.type(text, { delay: 40 });
      await listbox(p).getByRole("option").first().waitFor();
      return field(p);
    },
    ...extra,
  };
}

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
      const search = root.locator('[data-slot="search-input"]');
      const target = (await search.count()) ? search.first() : root.locator('[data-slot="emoji"]').first();
      await target.click();
      return target;
    },
    ...extra,
  };
}

const tab = (name: string) => async (p: Page) => {
  await p.getByRole("tab", { name, exact: true }).first().click();
};

/* ------------------------------------------------------------------ gallery */

export const STYLES = ["apple", "slack", "discord", "notion", "linear", "instagram"] as const;
export type StyleId = (typeof STYLES)[number];
const LABEL: Record<StyleId, string> = { apple: "Apple", slack: "Slack", discord: "Discord", notion: "Notion", linear: "Linear", instagram: "Instagram" };

/** iMessage opens the tapback on the last message by itself; a press on its layer (outside the pill) closes it. */
async function dismissTapback(p: Page) {
  const dim = card(p).locator("div.absolute.inset-0.z-20");
  await dim.waitFor();
  // The status bar sits over the layer's free corners, so press the layer itself.
  await dim.dispatchEvent("pointerdown", { bubbles: true, isPrimary: true });
  await dim.waitFor({ state: "detached" });
}

/** The pickers inside each app scene. */
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
        popover(id("reaction"), path, (p) => button(sc(p), "Add reaction").first()),
        popover(id("composer"), path, (p) => button(sc(p), "Emoji")),
        menu(id("autocomplete"), path, (p) => sc(p).getByLabel("Message #general", { exact: true }), ":smi", shotCard),
      ];
    case "discord":
      return [
        // The "+" after a message's reaction pills (the hover toolbar's own "Add Reaction" is only shown on hover).
        popover(id("reaction"), path, (p) => button(sc(p), "eyes, 2 reactions").locator("xpath=..").getByRole("button", { name: "Add Reaction" })),
        popover(id("composer"), path, (p) => button(sc(p), "Select emoji")),
        menu(id("autocomplete"), path, (p) => sc(p).getByLabel("Message #general", { exact: true }), ":smi", shotCard),
      ];
    case "notion":
      return [
        popover(id("page-icon"), path, (p) => button(sc(p), "Change icon")),
        menu(id("colon-menu"), path, (p) => sc(p).getByLabel("Page content", { exact: true }), ":sm", shotCard),
      ];
    case "linear":
      return [
        popover(id("issue-icon"), path, (p) => button(sc(p), "Set icon")),
        popover(id("reaction"), path, (p) => button(sc(p), "Add reaction").first()),
        popover(id("team-icon"), path, (p) => button(p, "Change team icon")),
        menu(id("comment-autocomplete"), path, (p) => sc(p).getByLabel("Leave a comment", { exact: true }), ":smi", shotCard),
      ];
    case "instagram": {
      const bar = (p: Page) => p.locator('[data-slot="popover-content"][aria-label="Reactions"], [role="dialog"]:has([aria-label="More reactions"])').filter({ visible: true }).last();
      const openBar = async (p: Page) => {
        const message = sc(p).getByRole("button", { name: /^Maya: ok who's in/ });
        if (await message.count()) await hold(p, message);
        else await button(sc(p), "React").first().click();
        await bar(p).waitFor();
      };
      return [
        { id: id("reaction-bar"), path, kind: "bar", root: bar, open: async (p) => (await openBar(p), button(sc(p), "React").first()) },
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
    popover(id("tapback-more"), path, (p) => button(card(p, "Tapback"), "More emoji")),
    popover(id("reactions-add"), path, (p) => button(card(p, "Reactions"), "Add reaction")),
    menu(id("autocomplete"), path, (p) => card(p, "Autocomplete").locator("input"), ":smi", { frame: (p) => card(p, "Autocomplete") }),
    inline(id("sheet"), path, (p) => card(p, "Sheet")),
  ];
}

/* ------------------------------------------------------------------ home + examples */

const home: Surface[] = [
  popover("home/hero-apple-tapback-more", "/", (p) => hero(p).getByRole("toolbar", { name: "Tapbacks" }).getByRole("button", { name: "More emoji" })),
  ...STYLES.filter((s) => s !== "apple").map((s) => inline(`home/hero-${s}`, "/", hero, { prepare: tab(LABEL[s]) })),
  inline("home/inline-tailwind", "/", (p) => preview(p, "inline")),
  inline("home/inline-css-modules", "/", (p) => preview(p, "inline"), { prepare: async (p) => example(p, "inline").getByRole("tab", { name: "CSS Modules" }).click() }),
  popover("home/popover", "/", (p) => button(example(p, "popover"), "Open emoji picker")),
  {
    // The tapback expands in place into the full picker.
    id: "home/tapback-more",
    path: "/",
    kind: "picker",
    root: (p) => preview(p, "tapback"),
    trigger: (p) => button(preview(p, "tapback"), "More emoji"),
    open: async (p) => {
      await button(preview(p, "tapback"), "More emoji").click();
      await preview(p, "tapback").locator('[data-slot="search-input"]').waitFor();
      return button(preview(p, "tapback"), "More emoji");
    },
  },
  inline("home/search", "/", (p) => preview(p, "search")),
  inline("home/custom-emoji", "/", (p) => preview(p, "custom-emoji")),
  inline("home/custom-cells-and-rows", "/", (p) => preview(p, "custom-cells-and-rows")),
  menu("home/autocomplete", "/", (p) => example(p, "headless").getByLabel("Message", { exact: true }), ":smi", { frame: (p) => preview(p, "headless") }),
];

const tiptapEditor = (p: Page) => p.locator("main [contenteditable=true]").first();
const examples: Surface[] = [
  menu("examples/tiptap/menu", "/examples/tiptap/", tiptapEditor, ":smi"),
  popover("examples/tiptap/insert", "/examples/tiptap/", (p) => button(p, "Insert emoji")),
  menu("examples/lexical/menu", "/examples/lexical/", (p) => p.getByLabel("Editor", { exact: true }), ":smi"),
  popover("examples/lexical/insert", "/examples/lexical/", (p) => button(p, "Insert emoji")),
  inline("examples/custom-emoji", "/examples/custom-emoji/", (p) => p.locator("main").getByRole("complementary").first()),
  // Cleared: the page starts on a query ("jurassic park") that has no results before the model downloads.
  inline("examples/semantic-search", "/examples/semantic-search/", (p) => p.locator("main").getByRole("complementary").first(), {
    prepare: async (p) => button(p.locator("main"), "Clear").click(),
  }),
];

export const SURFACES: Surface[] = [...STYLES.flatMap(gallery), ...home, ...examples];

/* ------------------------------------------------------------------ static screenshots */

/** Screenshots that open nothing (or open something that isn't a picker). */
export type Shot = { id: string; path: string; only?: Viewport; prepare?: (page: Page) => Promise<void>; frame: (page: Page) => Locator; mask?: (page: Page) => Locator[] };

const ENGINES = ["lexical()", "No typos", "+ Fuse", "+ Frequents", "Async"];
const searchFor = (engine: string, mode = "Ranked") => async (p: Page) => {
  const ex = example(p, "search");
  // By keyboard: at phone width the Results chips overlap the last engine chip ("Async").
  for (const name of [engine, mode]) {
    await ex.getByRole("tab", { name, exact: true }).focus();
    await p.keyboard.press("Enter");
  }
  await preview(p, "search").locator('[data-slot="search-input"]').fill("smile");
  await preview(p, "search").locator('[data-slot="emoji"]').first().waitFor();
};

export const SHOTS: Shot[] = [
  ...STYLES.flatMap((s): Shot[] => {
    const path = `/gallery/#${s}`;
    return [
      { id: `gallery/${s}/scene`, path, frame: (p) => card(p) },
      { id: `gallery/${s}/tapback`, path, frame: (p) => card(p, "Tapback") },
      { id: `gallery/${s}/reactions`, path, frame: (p) => card(p, "Reactions") },
    ];
  }),
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
