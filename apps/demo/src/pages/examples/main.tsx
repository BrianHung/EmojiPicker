import { createRoot } from "react-dom/client";
import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/site/copy-page";
import { DocsLayout } from "@/components/site/docs-layout";
import { SiteShell } from "@/components/site/shell";
import { EXAMPLES } from "@/lib/examples";
import "@/globals.css";

const ALL: { title: string; href: string; description?: string } = { title: "All examples", href: "https://github.com/BrianHung/emoji-components/tree/main/examples" };

function Examples() {
  return (
    <DocsLayout>
      <PageHeader title="Examples" description="Recipes and integrations to copy into your app." className="mb-8" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[...EXAMPLES, ALL].map((e) => (
          <a key={e.href} href={e.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full bg-background transition-colors group-hover:bg-accent/50">
              <CardHeader>
                <CardTitle>{e.title}</CardTitle>
                {e.description && <CardDescription>{e.description}</CardDescription>}
                <CardAction>
                  {e === ALL ? (
                    <ArrowUpRightIcon className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  ) : (
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  )}
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
