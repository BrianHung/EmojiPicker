// /examples/: the editor integrations.
import { createRoot } from "react-dom/client";
import { ArrowRightIcon } from "lucide-react";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "../components/copy-page";
import { SiteFooter, SiteShell } from "../components/site";
import "../styles.css";

const EXAMPLES = [
  { title: "Tiptap", href: "/examples/tiptap/", description: "Shortcode suggestions and an emoji picker for the Tiptap editor." },
  { title: "Lexical", href: "/examples/lexical/", description: "Shortcode suggestions and an emoji picker for the Lexical editor." },
];

function Examples() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-14">
      <PageHeader title="Examples" description="The picker inside rich-text editors." md="/examples.md" className="mb-8" />
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
      <SiteFooter />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <SiteShell page="examples">
    <Examples />
  </SiteShell>,
);
