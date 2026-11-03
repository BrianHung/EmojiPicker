import * as React from "react";
import { TableOfContents } from "./toc";

/** A docs page: the content column centered in the viewport, and "On this page" in the right gutter when it fits (as on shadcn). */
export function DocsLayout({ toc = false, children }: { toc?: boolean; children: React.ReactNode }) {
  const content = React.useRef<HTMLElement>(null);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-[1fr_minmax(0,48rem)_1fr]">
      <main ref={content} className="mx-auto w-full max-w-3xl min-w-0 px-4 pt-10 sm:px-6 sm:pt-14 xl:col-start-2">
        {children}
      </main>
      {toc ? (
        <aside className="hidden xl:flex xl:justify-end">
          <div className="sticky top-16 h-fit w-56 pt-14 pr-6">
            <TableOfContents root={content} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
