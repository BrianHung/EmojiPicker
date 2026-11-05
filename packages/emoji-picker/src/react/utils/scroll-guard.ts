// Internal: keeps clipped parts of the picker from scrolling.
import * as React from "react";

/**
 * Focusing a partly hidden element (the last category tab, a cell under a
 * rounded corner) makes the browser scroll every ancestor to show it, including
 * `overflow: hidden` ones, which users can't scroll back. Inside the picker those
 * snap back; real scrollers (the Viewport, a scrolling tab bar) are left alone.
 * Scroll events fire before paint, so the shift never shows.
 */
export function useClippedScrollGuard(root: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !(target === el || el.contains(target))) return;
      const style = getComputedStyle(target);
      const clipped = (overflow: string) => overflow === "hidden" || overflow === "clip";
      if (target.scrollLeft && clipped(style.overflowX)) target.scrollLeft = 0;
      if (target.scrollTop && clipped(style.overflowY)) target.scrollTop = 0;
    };
    el.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => el.removeEventListener("scroll", onScroll, { capture: true });
  }, [root]);
}
