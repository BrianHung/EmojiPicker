// "On this page": built from the headings marked `data-toc` inside `root`, with
// scroll-spy (the last heading scrolled past the header is the active one).
import * as React from "react";
import { cn } from "./code";

type Item = { id: string; title: string; depth: number };

const OFFSET = 96; // sticky header + breathing room

export function TableOfContents({ root }: { root: React.RefObject<HTMLElement | null> }) {
  const [items, setItems] = React.useState<Item[]>([]);
  const [active, setActive] = React.useState<string | null>(null);

  // Collect headings (and re-collect if the content changes).
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const collect = () => {
      const next = [...el.querySelectorAll<HTMLElement>("[data-toc]")].map((h) => ({ id: h.id, title: (h.textContent ?? "").replace(/#$/, "").trim(), depth: Number(h.dataset.toc) }));
      setItems((prev) => (prev.length === next.length && prev.every((p, i) => p.id === next[i]!.id && p.title === next[i]!.title) ? prev : next));
    };
    collect();
    const mo = new MutationObserver(collect);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [root]);

  // Scroll-spy.
  React.useEffect(() => {
    if (!items.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current: string | null = items[0]!.id;
      if (atBottom) current = items[items.length - 1]!.id;
      else
        for (const item of items) {
          const h = document.getElementById(item.id);
          if (h && h.getBoundingClientRect().top <= OFFSET) current = item.id;
        }
      setActive(current);
    };
    const schedule = () => (frame ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  // Keep the active entry visible inside the (scrollable) list.
  const list = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const box = list.current;
    const link = box?.querySelector<HTMLElement>(`[data-active]`);
    if (!box || !link) return;
    const top = link.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 24 || top > box.scrollTop + box.clientHeight - 48) box.scrollTo({ top: top - box.clientHeight / 3 });
  }, [active]);

  if (!items.length) return null;
  return (
    <nav aria-label="On this page" className="text-[13px]">
      {/* As on Base UI: the heading goes back to the top of the page. */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          history.replaceState(null, "", location.pathname + location.search);
        }}
        className="mb-3 block font-medium text-foreground hover:text-foreground/80"
      >
        On this page
      </a>
      <div ref={list} className="relative max-h-[calc(100vh-10rem)] overflow-y-auto [scrollbar-width:none]">
        <ul className="flex flex-col border-l border-border">
          {items.map((item) => {
            const on = item.id === active;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  data-active={on ? "" : undefined}
                  aria-current={on ? "location" : undefined}
                  className={cn(
                    "-ml-px block border-l py-1 leading-5 transition-colors",
                    item.depth === 3 ? "pl-6" : "pl-3",
                    on ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
