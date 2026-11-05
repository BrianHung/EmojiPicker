// Current behaviour the suite tolerates rather than hides: each entry is a bug to fix, not a
// baseline. Remove an entry when its fix lands (the test then holds the fix).

const SHEET_KEYS = ["ArrowDown", "ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp"];
const touch = (id: string, keys: string[]) => ({ [`mobile:${id}`]: keys });

/** "<project>:<surface id>" → the keys (in trace order) that currently scroll the window. */
export const PAGE_SCROLLS: Record<string, string[]> = {
  // On touch, iMessage's emoji keyboard sheet opens without taking focus (focusing its search would
  // raise the on-screen keyboard), so a hardware keyboard's keys scroll the page.
  ...touch("gallery/apple/scene-tapback-more", SHEET_KEYS),
  ...touch("gallery/apple/scene-composer", SHEET_KEYS),
  ...touch("home/hero-apple-tapback-more", SHEET_KEYS),
};
