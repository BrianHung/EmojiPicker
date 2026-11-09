import { createRoot } from "react-dom/client";
import { PageHeader } from "@/components/site/copy-page";
import { DocsLayout } from "@/components/site/docs-layout";
import { SiteShell } from "@/components/site/shell";
import { homeComponents } from "./components";
import { Hero } from "./hero";
import Content, { frontmatter } from "./page.mdx";
import "@/globals.css";

const MOVED: Record<string, string> = { parts: "#usage", "custom-virtualizer": "/examples/virtualizer/" };
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
