import { type Locator, mergeTests, type Page, type TestType } from "@playwright/test";
import { nvdaTest, voiceOverTest, type VoiceOverPlaywright } from "@guidepup/playwright";
import { homePopover, surface } from "../surfaces";
import { expect, test as site, visit } from "../support";
import { notReady } from "./ready";

export type Reader = Pick<VoiceOverPlaywright, "capture" | "spokenPhraseLog" | "navigateToWebContent">;

const READERS = {
  voiceover: {
    name: "VoiceOver",
    test: () => {
      const test = mergeTests(site, voiceOverTest).extend<{ sr: Reader }>({ sr: ({ voiceOver }, use) => use(voiceOver) });
      test.use({ voiceOverStartOptions: { capture: true } });
      return test;
    },
  },
  nvda: {
    name: "NVDA",
    test: () => {
      const test = mergeTests(site, nvdaTest).extend<{ sr: Reader }>({ sr: ({ nvda }, use) => use(nvda) });
      test.use({ nvdaStartOptions: { capture: true } });
      return test;
    },
  },
};

export function readerSuite(id: keyof typeof READERS) {
  const { name, test } = READERS[id];
  const suite = test();
  const skip = process.env.CI ? null : notReady(id);
  if (skip) console.warn(`Skipping the ${name} suite: ${skip}`);
  suite.skip(!!skip, skip ?? "");
  scenarios(suite);
}

const FIELD = /combo ?box|search ?(text )?field|search ?box|\bedit\b|text field/;
const SEARCH = /search for an emoji/;

class Ear {
  constructor(
    private sr: Reader,
    private page: Page,
  ) {}

  async hear(action: () => Promise<unknown>, pattern?: RegExp, ms = 5_000) {
    return this.hearAll([action], pattern, ms);
  }

  // Guidepup reads the last phrase only after an action, so what a reader says between keystrokes is captured one key at a time
  async hearAll(actions: (() => Promise<unknown>)[], pattern?: RegExp, ms = 5_000) {
    const from = (await this.sr.spokenPhraseLog()).length;
    const said = async () => (await this.sr.spokenPhraseLog()).slice(from).join(" | ").toLowerCase();
    for (const action of actions) await this.sr.capture(action, { capture: true });
    for (const end = Date.now() + ms; pattern && !pattern.test(await said()) && Date.now() < end; ) await this.sr.capture(() => this.page.waitForTimeout(250), { capture: true });
    return said();
  }

  async press(key: string, pattern: RegExp, why: string) {
    const said = await this.hear(() => this.page.keyboard.press(key), pattern);
    expect(said, why).toMatch(pattern);
    return said;
  }

  async type(text: string, pattern: RegExp, why: string) {
    const said = await this.hearAll(
      [...text].map((key) => () => this.page.keyboard.type(key)),
      pattern,
    );
    expect(said, why).toMatch(pattern);
    return said;
  }
}

const homeTapbackAnchor = (p: Page) => p.locator("section:has(> h3#tapback)").getByRole("button", { name: "Copy code" }).first();
const discordNoSearch = (p: Page) => surface("gallery/discord/popover-no-search").trigger!(p);
const searchField = (p: Page) => p.getByRole("dialog", { name: "Emoji picker" }).getByLabel("Type to search for an emoji");

async function start(page: Page, sr: Reader, path: string, focus: Locator) {
  await visit(page, path);
  await sr.navigateToWebContent();
  await focus.focus();
  return new Ear(sr, page);
}

function scenarios(test: TestType<{ page: Page; sr: Reader }, object>) {
  test.afterEach(async ({ sr }, info) => {
    if (info.status === info.expectedStatus) return;
    const log = (await sr.spokenPhraseLog()).join("\n");
    console.log(`Spoken in "${info.title}":\n${log}`);
    await info.attach("spoken-phrases", { body: log, contentType: "text/plain" });
  });

  test("popover with search: the field is announced, then the result count", async ({ page, sr }) => {
    const ear = await start(page, sr, "/", homePopover(page));
    const opened = await ear.press("Enter", SEARCH, "opening announces the search field by name");
    expect(opened, "…and as a text field").toMatch(FIELD);
    await ear.type("heart", /\d+ results?/, "the result count is announced");
  });

  test("arrows speak each emoji's name, with the skin tone once one is set", async ({ page, sr }) => {
    const ear = await start(page, sr, "/", homePopover(page));
    await ear.press("Enter", SEARCH, "the search field");
    const first = await ear.type("heart", /heart/, "typing highlights and speaks the first result");
    const next = await ear.press("ArrowRight", /\w/, "the next result's name");
    expect(next, "a different emoji").not.toBe(first);

    await page.keyboard.press("Escape");
    await ear.press("Tab", /skin tone/, "the skin tone button");
    await ear.press("Enter", /default skin tone/, "the tone options open on the current one");
    await ear.press("ArrowRight", /light skin tone/, "the next tone");
    await ear.press("ArrowRight", /medium-light skin tone/, "the next tone");
    await ear.press("Enter", /medium-light skin tone/, "the chosen tone");
    await ear.press("Shift+Tab", SEARCH, "back to the search field");
    await ear.type("thumbs up", /thumbs up.{0,40}medium-light skin tone/, "the highlighted match's name includes the tone");
  });

  test("crossing into the next section speaks its name", async ({ page, sr }, info) => {
    test.fail(info.project.name === "voiceover", "VoiceOver reads a group's name on first entry only, not when focus moves into the next group; NVDA reads it");
    const ear = await start(page, sr, "/gallery/#discord", discordNoSearch(page));
    await ear.press("Enter", /thumbs up/, "the first emoji (Frequently Used)");
    let said = "";
    for (let i = 0; i < 4 && !/people/.test(said); i++) said = await ear.hear(() => page.keyboard.press("ArrowDown"), /people/, 1_500);
    expect(said, "entering People announces the section").toMatch(/people/);
  });

  test("Enter picks: the selection is announced and focus returns to the trigger", async ({ page, sr }) => {
    const trigger = homePopover(page);
    const ear = await start(page, sr, "/", trigger);
    await ear.press("Enter", SEARCH, "the search field");
    await ear.type("thumbs up", /thumbs up/, "the highlighted match");
    await ear.press("Enter", /thumbs up/, "the pick is announced");
    await expect(trigger).toBeFocused();
  });

  test("Escape clears the query, then closes and returns to the trigger", async ({ page, sr }) => {
    const trigger = homePopover(page);
    const ear = await start(page, sr, "/", trigger);
    await ear.press("Enter", SEARCH, "the search field");
    await ear.hear(() => page.keyboard.type("heart", { delay: 60 }), /\d+ results?/);
    await ear.hear(() => page.keyboard.press("Escape"));
    await expect(searchField(page), "the first Escape clears the query and keeps the picker open").toHaveValue("");
    await ear.press("Escape", /open emoji picker/, "the second closes it and the trigger is announced");
    await expect(trigger).toBeFocused();
  });

  test("popover without search: the first emoji is focused and arrows speak names", async ({ page, sr }) => {
    const ear = await start(page, sr, "/gallery/#discord", discordNoSearch(page));
    await ear.press("Enter", /thumbs up/, "the first emoji is announced on open");
    await ear.press("ArrowRight", /red heart/, "the next emoji");
    await ear.press("ArrowLeft", /thumbs up/, "and back");
  });

  test("tapback: one tab stop, arrows speak reactions, + expands into the picker", async ({ page, sr }) => {
    const ear = await start(page, sr, "/", homeTapbackAnchor(page));
    await ear.press("Tab", /thumbs up/, "Tab enters the row on its first reaction");
    await ear.press("ArrowRight", /red heart/, "Right: the next reaction");
    await ear.press("ArrowLeft", /thumbs up/, "Left: back");
    const left = await ear.hear(() => page.keyboard.press("Tab"));
    expect(left, "Tab leaves the row (a single tab stop)").not.toMatch(/red heart|tears of joy|party popper|more emoji/);
    await ear.press("Shift+Tab", /thumbs up/, "Shift+Tab comes back to the reaction it left");
    await ear.press("End", /more emoji/, "End: the + button");
    const opened = await ear.press("Enter", SEARCH, "+ expands into the picker, on its search field");
    expect(opened).toMatch(FIELD);
  });

  test("Discord: a section header's collapse state is spoken", async ({ page, sr }) => {
    const ear = await start(page, sr, "/gallery/#discord", discordNoSearch(page));
    await ear.press("Enter", /thumbs up/, "the picker opens on its first emoji");
    let said = "";
    for (let i = 0; i < 4 && !/expanded/.test(said); i++) said = await ear.hear(() => page.keyboard.press("Tab"), /expanded/, 1_500);
    expect(said, "Tab reaches a section header, announced expanded").toMatch(/expanded/);
    await ear.press("Enter", /collapsed/, "Enter collapses it");
    await ear.press("Enter", /expanded/, "and expands it again");
  });
}
