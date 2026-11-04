// Current behaviour the suite tolerates rather than hides: each entry is a bug to fix, not a
// baseline. Remove an entry when its fix lands (the test then holds the fix).

const SHEET_KEYS = ["ArrowDown", "ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp"];
const both = (id: string, keys: string[]) => ({ [`desktop:${id}`]: keys, [`mobile:${id}`]: keys });

/** "<project>:<surface id>" → the keys (in trace order) that currently scroll the window. */
export const PAGE_SCROLLS: Record<string, string[]> = {
  // iMessage's emoji keyboard sheet opens without taking focus (it stays on <body>), so every key
  // scrolls the page. (The first ArrowRight/ArrowLeft land at the page's horizontal edge.)
  ...both("gallery/apple/scene-tapback-more", SHEET_KEYS),
  ...both("gallery/apple/scene-composer", SHEET_KEYS),
  ...both("home/hero-apple-tapback-more", SHEET_KEYS),
};
