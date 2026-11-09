import { createRoot } from "react-dom/client";
import { ArrowRightIcon } from "lucide-react";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/site/copy-page";
import { DocsLayout } from "@/components/site/docs-layout";
import { SiteShell } from "@/components/site/shell";
import { EXAMPLES } from "@/lib/examples";
import "@/globals.css";

function Examples() {
  return (
    <DocsLayout>
      <PageHeader title="Examples" description="Recipes and integrations to copy into your app." className="mb-8" />
      <div className="grid gap-4 sm:grid-cols-2">
        {EXAMPLES.map((e) => (
          <a key={e.href} href={e.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full bg-background transition-colors group-hover:bg-accent/50">
              <CardHeader>
                <CardTitle>{e.title}</CardTitle>
                <CardDescription>{e.description}</CardDescription>
                <CardAction>
                  <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardAction>
              </CardHeader>
            </Card>
          </a>
        ))}
      </div>
    </DocsLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <SiteShell page="examples">
    <Examples />
  </SiteShell>,
);
