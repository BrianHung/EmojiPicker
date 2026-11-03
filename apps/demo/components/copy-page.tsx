// shadcn's "Copy Page" split button: copy the page's Markdown, or open it as Markdown,
// in Claude or in ChatGPT. `md` is the page's Markdown URL (see markdown-docs.ts).
import * as React from "react";
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import { ClaudeIcon, MarkdownIcon, OpenAIIcon } from "./site/brand-icons";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** shadcn's menu items: icon left, 14px label, ~36px tall, rounded highlight. */
const ITEM = "h-9 gap-2.5 rounded-md px-2.5 text-sm [&_svg]:size-4";

/** One-line usage: `<CopyPage md="/docs.md" />` (any route listed in markdown-docs.ts). */
export function CopyPage({ md, className }: { md: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  // Fetched ahead of the click: the clipboard write then happens inside the user gesture.
  const markdown = React.useRef<Promise<string> | null>(null);
  const load = React.useCallback(() => (markdown.current ??= fetch(md).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${md}`))))), [md]);
  React.useEffect(() => {
    load().catch(() => (markdown.current = null));
  }, [load]);

  const url = typeof location === "undefined" ? md : new URL(md, location.origin).href;
  const prompt = encodeURIComponent(`Read ${url} and help me integrate @brianhung/emoji-picker into my app.`);

  const copy = async () => {
    try {
      const text = load();
      // Safari wants the write started synchronously; ClipboardItem takes the pending text.
      if (typeof ClipboardItem !== "undefined" && "supports" in ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) })]);
      } else {
        await navigator.clipboard.writeText(await text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      markdown.current = null;
    }
  };

  return (
    <ButtonGroup className={cn("shrink-0", className)}>
      <Button variant="secondary" size="sm" onClick={copy} aria-live="polite" className="max-sm:h-10">
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy Page"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="secondary" size="icon-sm" aria-label="More page options" className="border-l border-l-background/60 max-sm:size-10" />}>
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-1">
          <DropdownMenuItem className={ITEM} render={<a href={md} target="_blank" rel="noreferrer" />}>
            <MarkdownIcon />
            View as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} render={<a href={`https://chatgpt.com/?q=${prompt}`} target="_blank" rel="noreferrer" />}>
            <OpenAIIcon />
            Open in ChatGPT
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} render={<a href={`https://claude.ai/new?q=${prompt}`} target="_blank" rel="noreferrer" />}>
            <ClaudeIcon />
            Open in Claude
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}

/** A page title row: h1 and description, with Copy Page beside the title (below the description on mobile). */
export function PageHeader({ title, description, md, className }: { title: React.ReactNode; description: React.ReactNode; md: string; className?: string }) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6", className)}>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <CopyPage md={md} className="mt-2 sm:col-start-2 sm:row-start-1 sm:mt-0.5 sm:self-start max-sm:order-last" />
      <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
    </div>
  );
}
