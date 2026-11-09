import { createRoot } from "react-dom/client";
import { PageHeader } from "@/components/site/copy-page";
import { DocsLayout } from "@/components/site/docs-layout";
import { SiteShell } from "@/components/site/shell";
import { homeComponents } from "./components";
import { Hero } from "./hero";
import Content, { frontmatter } from "./page.mdx";
import "@/globals.css";

const MOVED: Record<string, string> = {
  parts: "#usage",
  "keep-open": "/examples/keep-open/",
  "custom-popover": "/examples/custom-popover/",
  provider: "/examples/provider/",
  search: "/examples/search/",
  "command-palette": "/examples/command-palette/",
  rendering: "/examples/rendering/",
  "custom-cells": "/examples/custom-cells/",
  "custom-virtualizer": "/examples/virtualizer/",
};
const moved = MOVED[location.hash.slice(1)];
if (moved?.startsWith("#")) history.replaceState(null, "", moved);
else if (moved) location.replace(moved);

createRoot(document.getElementById("root")!).render(
  <SiteShell page="docs">
    <DocsLayout toc>
      <div className="flex flex-col gap-16">
        <div className="flex flex-col gap-6">
          <PageHeader title={frontmatter.title} description={frontmatter.description} md="/docs.md" />
          <Hero />
        </div>
        <Content components={homeComponents} />
      </div>
    </DocsLayout>
  </SiteShell>,
);
