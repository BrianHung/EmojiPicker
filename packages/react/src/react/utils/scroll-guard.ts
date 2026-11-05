import * as React from "react";

// Focusing a clipped element scrolls overflow:hidden ancestors users can't scroll back: snap them back
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
