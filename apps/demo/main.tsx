import * as React from "react";
import { createRoot } from "react-dom/client";
import { PageHeader } from "./components/copy-page";
import { SiteFooter, SiteShell, useRenderer } from "./components/site";
import { TableOfContents } from "./components/toc";
import { Hero } from "./sections/hero";
import { Anatomy, Installation } from "./sections/guide";
import { Examples } from "./sections/examples";
import { ApiReference } from "./sections/api";
import "./styles.css";

function Docs() {
  const renderer = useRenderer();
  const content = React.useRef<HTMLDivElement>(null);
  return (
    // The content column is centered in the viewport; the TOC sits in the right gutter when it fits.
    <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-[1fr_minmax(0,48rem)_1fr]">
      <main ref={content} className="mx-auto w-full max-w-3xl min-w-0 px-4 pt-10 sm:px-6 sm:pt-14 xl:col-start-2">
        <div className="flex flex-col gap-16">
          <div className="flex flex-col gap-6">
            <PageHeader title="Emoji Picker" description="Unstyled React parts for emoji pickers, tapbacks and shortcode autocomplete." md="/docs.md" />
            <Hero renderer={renderer} />
          </div>
          <Installation />
          <Anatomy />
          <Examples />
          <ApiReference />
        </div>
        <SiteFooter />
      </main>
      {/* Like shadcn, the TOC sits toward the window's right edge, not against the content. */}
      <aside className="hidden xl:flex xl:justify-end">
        <div className="sticky top-16 h-fit w-56 pt-14 pr-6">
          <TableOfContents root={content} />
        </div>
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <SiteShell page="docs">
    <Docs />
  </SiteShell>,
);
