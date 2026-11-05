// High-intent screen reader scenarios, shared by VoiceOver and NVDA. Keys go in through Playwright;
// each assertion is on what the screen reader said (Guidepup's spoken phrase log, lowercased,
// matched loosely) or where focus is. Nothing here depends on the markup's roles, so the suite holds
// across the grid → listbox migration: role words are matched from either vocabulary.
import type { Locator, Page, TestType } from "@playwright/test";
import type { VoiceOverPlaywright } from "@guidepup/playwright";
import { card } from "../surfaces";
import { expect, visit } from "../support";

export type Reader = Pick<VoiceOverPlaywright, "capture" | "spokenPhraseLog" | "navigateToWebContent">;

/** How a text field is announced: "combo box" / "search field" / "edit" / "search box"… */
const FIELD = /combo ?box|search ?(text )?field|search ?box|\bedit\b|text field/;
const SEARCH = /search for an emoji/;

/** Listens to the screen reader while actions run. */
class Ear {
  constructor(
    private sr: Reader,
    private page: Page,
  ) {}

  /** Runs `action`, then keeps listening (up to `ms`) until `pattern` is heard; returns everything said, lowercased. */
  async hear(action: () => Promise<unknown>, pattern?: RegExp, ms = 5_000) {
    const from = (await this.sr.spokenPhraseLog()).length;
    const said = async () => (await this.sr.spokenPhraseLog()).slice(from).join(" | ").toLowerCase();
    await this.sr.capture(action, { capture: true });
    for (const end = Date.now() + ms; pattern && !pattern.test(await said()) && Date.now() < end; ) await this.sr.capture(() => this.page.waitForTimeout(250), { capture: true });
    return said();
  }

  /** Presses a key and asserts what was said. */
  async press(key: string, pattern: RegExp, why: string) {
    const said = await this.hear(() => this.page.keyboard.press(key), pattern);
    expect(said, why).toMatch(pattern);
    return said;
  }

  /** Types into the focused field and asserts what was said. */
  async type(text: string, pattern: RegExp, why: string) {
    const said = await this.hear(() => this.page.keyboard.type(text, { delay: 60 }), pattern);
    expect(said, why).toMatch(pattern);
    return said;
  }
}

/* ------------------------------------------------------------------ where */

const homePopover = (p: Page) => p.locator("section:has(> h3#popover)").getByRole("button", { name: "Open emoji picker", exact: true });
const homeTapbackAnchor = (p: Page) => p.locator("section:has(> h3#tapback)").getByRole("link", { name: "Link to this section" });
const discordNoSearch = (p: Page) => card(p, "Popover without search").getByRole("button", { name: "Open emoji picker", exact: true });
const searchField = (p: Page) => p.getByRole("dialog", { name: "Emoji picker" }).getByLabel("Type to search for an emoji");

async function start(page: Page, sr: Reader, path: string, focus: Locator) {
  await visit(page, path);
  await sr.navigateToWebContent();
  await focus.focus();
  return new Ear(sr, page);
}

/* ------------------------------------------------------------------ scenarios */

export function scenarios(test: TestType<{ page: Page; sr: Reader }, object>) {
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
    const typed = await ear.hear(() => page.keyboard.type("heart", { delay: 120 }), /\d+ results?/);
    expect(typed, "the result count is announced").toMatch(/\d+ results?/);
  });

  test("arrows speak each emoji's name, with the skin tone once one is set", async ({ page, sr }) => {
    const ear = await start(page, sr, "/", homePopover(page));
    await ear.press("Enter", SEARCH, "the search field");
    await ear.hear(() => page.keyboard.type("heart", { delay: 60 }));
    const first = await ear.press("ArrowDown", /heart/, "the first result's name");
    const next = await ear.press("ArrowRight", /\w/, "the next result's name");
    expect(next, "a different emoji").not.toBe(first);

    // Skin tone: the tone button, its options, then the toned name in the results.
    await page.keyboard.press("Escape"); // clears the query
    await ear.press("Tab", /skin tone/, "the skin tone button");
    await ear.press("Enter", /default skin tone/, "the tone options open on the current one");
    await ear.press("ArrowRight", /light skin tone/, "the next tone");
    await ear.press("ArrowRight", /medium-light skin tone/, "the next tone");
    await ear.press("Enter", /medium-light skin tone/, "the chosen tone");
    await ear.press("Shift+Tab", SEARCH, "back to the search field");
    await ear.type("thumbs up", /thumbs up.{0,40}medium-light skin tone/, "the highlighted match's name includes the tone");
  });

  test("crossing into the next section speaks its name", async ({ page, sr }) => {
    const ear = await start(page, sr, "/gallery/#discord", discordNoSearch(page));
    await ear.press("Enter", /red heart/, "the first emoji (Frequently Used)");
    let said = "";
    for (let i = 0; i < 4 && !/people/.test(said); i++) said = await ear.hear(() => page.keyboard.press("ArrowDown"), /people/, 1_500);
    expect(said, "entering People announces the section").toMatch(/people/);
  });

  test("Enter picks: the selection is announced and focus returns to the trigger", async ({ page, sr }) => {
    const trigger = homePopover(page);
    const ear = await start(page, sr, "/", trigger);
    await ear.press("Enter", SEARCH, "the search field");
    await ear.type("thumbs up", /thumbs up/, "the highlighted match");
    await ear.press("Enter", /thumbs up[\s\S]*open emoji picker|open emoji picker[\s\S]*thumbs up/, "the pick (toast) and the returning trigger are announced");
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
    await ear.press("Enter", /red heart/, "the first emoji is announced on open");
    await ear.press("ArrowRight", /thumbs up/, "the next emoji");
    await ear.press("ArrowLeft", /red heart/, "and back");
  });

  test("tapback: one tab stop, arrows speak reactions, + expands into the picker", async ({ page, sr }) => {
    const ear = await start(page, sr, "/", homeTapbackAnchor(page));
    await ear.press("Tab", /red heart/, "Tab enters the row on its first reaction");
    await ear.press("ArrowRight", /thumbs up/, "Right: the next reaction");
    await ear.press("ArrowLeft", /red heart/, "Left: back");
    const left = await ear.hear(() => page.keyboard.press("Tab"));
    expect(left, "Tab leaves the row (a single tab stop)").not.toMatch(/thumbs up|thumbs down|tears of joy|more emoji/);
    await ear.press("Shift+Tab", /red heart/, "Shift+Tab comes back to the reaction it left");
    await ear.press("End", /more emoji/, "End: the + button");
    const opened = await ear.press("Enter", SEARCH, "+ expands into the picker, on its search field");
    expect(opened).toMatch(FIELD);
  });

  test("Discord: a section header's collapse state is spoken", async ({ page, sr }) => {
    const ear = await start(page, sr, "/gallery/#discord", discordNoSearch(page));
    await ear.press("Enter", /red heart/, "the picker opens on its first emoji");
    let said = "";
    for (let i = 0; i < 4 && !/expanded/.test(said); i++) said = await ear.hear(() => page.keyboard.press("Tab"), /expanded/, 1_500);
    expect(said, "Tab reaches a section header, announced expanded").toMatch(/expanded/);
    await ear.press("Enter", /collapsed/, "Enter collapses it");
    await ear.press("Enter", /expanded/, "and expands it again");
  });
}
