export const PAGE_SCROLLS: Record<string, string[]> = {
  // iMessage's sheet takes no focus on touch (that would raise the on-screen keyboard), so hardware keys scroll the page
  "mobile:gallery/apple/scene-tapback-more": ["ArrowDown", "ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp"],
};
