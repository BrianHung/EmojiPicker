import { createRoot } from "react-dom/client";
import { PageHeader } from "@/components/site/copy-page";
import { DocsLayout } from "@/components/site/docs-layout";
import { SiteShell, useRenderer } from "@/components/site/shell";
import { ApiReference } from "./api-reference";
import { Examples } from "./examples";
import { Anatomy, Installation } from "./guide";
import { Hero } from "./hero";
import "@/globals.css";

function Home() {
  const renderer = useRenderer();
  return (
    <DocsLayout toc>
      <div className="flex flex-col gap-16">
        <div className="flex flex-col gap-6">
          <PageHeader title="Emoji Picker" description="Virtualized, unstyled React components for emoji pickers, tapbacks, and shortcode autocomplete." md="/docs.md" />
          <Hero renderer={renderer} />
        </div>
        <Installation />
        <Anatomy />
        <Examples />
        <ApiReference />
      </div>
    </DocsLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <SiteShell page="docs">
    <Home />
  </SiteShell>,
);
