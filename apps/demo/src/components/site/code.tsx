import * as React from "react";
import { codeToHtml, type Lang } from "@pierre/highlights";
import { pierreDark, pierreLight } from "@pierre/highlights/themes";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const decoder = new TextDecoder();
const cache = new Map<string, string>();
/** Highlighted once per source: both themes ride along as CSS light-dark(), so the site's color-scheme picks one. */
function highlight(code: string, lang: Lang) {
  const key = `${lang}\0${code}`;
  let html = cache.get(key);
  if (html === undefined) {
    html = decoder.decode(codeToHtml(code, { lang, themes: { light: pierreLight, dark: pierreDark }, defaultColor: "light-dark()" }));
    cache.set(key, html);
  }
  return html;
}

export type { Lang };

/** Highlighted source with no chrome: the building block of every code panel. */
export function CodeBlock({ code, lang = "tsx", className }: { code: string; lang?: Lang; className?: string }) {
  const html = React.useMemo(() => highlight(code.trim(), lang), [code, lang]);
  // The highlighter emits its own <pre>; reset its theme background so the panel shows through.
  return (
    <div
      className={cn("overflow-x-auto font-mono text-[13px] leading-[1.7] [&_code]:font-mono [&_pre]:!bg-transparent [&_pre]:px-4 [&_pre]:py-3.5", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const label = copied ? "Copied" : "Copy code";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn("text-muted-foreground max-sm:size-10", className)}
            onClick={() => {
              navigator.clipboard?.writeText(text.trim()).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              });
            }}
          />
        }
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** A titled code card (shadcn's figure with a caption bar). */
export function Code({ children, title, lang = "tsx" }: { children: string; title?: string; lang?: Lang }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-code">
      <figcaption className="flex h-10 items-center gap-2 border-b border-border pr-1.5 pl-4 text-[13px] text-muted-foreground">
        <span className="truncate">{title ?? lang}</span>
        <CopyButton text={children} className="ml-auto" />
      </figcaption>
      <CodeBlock code={children} lang={lang} />
    </figure>
  );
}
