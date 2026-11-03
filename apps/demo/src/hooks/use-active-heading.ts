import * as React from "react";

/**
 * The heading last scrolled into the top fifth of the viewport (shadcn's `useActiveItem`),
 * or the last one once the page is scrolled to the bottom. Defaults to the first.
 */
export function useActiveHeading(ids: string[]) {
  const [intersected, setIntersected] = React.useState<string | null>(null);
  const [atBottom, setAtBottom] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setIntersected(entry.target.id);
      },
      { rootMargin: "0% 0% -80% 0%" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  React.useEffect(() => {
    const update = () => setAtBottom(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!ids.length) return null;
  return atBottom ? ids.at(-1)! : (intersected ?? ids[0]!);
}
