import * as React from "react";
import { codeToHtml, type Lang } from "@pierre/highlights";
import { pierreDark, pierreLight } from "@pierre/highlights/themes";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const decoder = new TextDecoder();
const cache = new Map<string, string>();
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

export function CodeBlock({ code, lang = "tsx", className }: { code: string; lang?: Lang; className?: string }) {
  const html = React.useMemo(() => highlight(code.trim(), lang), [code, lang]);
  // Commands wrap, so a long install URL stays in view on a phone
  const wrap = lang === "bash" || lang === "sh";
  return (
    <div
      className={cn("overflow-x-auto font-mono text-[13px] leading-[1.7] [&_code]:font-mono [&_pre]:!bg-transparent [&_pre]:px-4 [&_pre]:py-3.5", wrap && "[&_pre]:whitespace-pre-wrap [&_pre]:[overflow-wrap:anywhere]", className)}
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
