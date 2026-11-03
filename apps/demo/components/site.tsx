// The shell every page shares: theme (stored, else system), the renderer choice,
// the site header and an EmojiProvider for the page.
import * as React from "react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, type Renderer } from "@brianhung/emoji-picker";
import { MenuIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "./code";

type Theme = "light" | "dark";

const read = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // per-viewer convenience only
  }
};

/** The stored theme, else the system's. One toggle flips the resolved theme and stores it. */
function useTheme(): [Theme, () => void] {
  const media = React.useMemo(() => window.matchMedia("(prefers-color-scheme: dark)"), []);
  const [stored, setStored] = React.useState<Theme | null>(() => {
    const saved = read("demo:theme", "");
    return saved === "light" || saved === "dark" ? saved : null;
  });
  const [systemDark, setSystemDark] = React.useState(media.matches);
  React.useEffect(() => {
    const change = () => setSystemDark(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [media]);
  const theme: Theme = stored ?? (systemDark ? "dark" : "light");
  React.useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    write("demo:theme", next);
    setStored(next);
  };
  return [theme, toggle];
}

/** A circle with its left half in horizontal stripes; in dark, the right half is solid. */
function ThemeIcon({ theme }: { theme: Theme }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 18 18" className="size-[18px]" fill="none" aria-hidden>
      <defs>
        <clipPath id={`${id}-left`}>
          <path d="M9 2a7 7 0 0 0 0 14Z" />
        </clipPath>
      </defs>
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
      <g clipPath={`url(#${id}-left)`} fill="currentColor">
        {[3.5, 6.25, 9, 11.75, 14.5].map((y) => (
          <rect key={y} x="1" y={y - 0.6} width="8" height="1.2" />
        ))}
      </g>
      {theme === "dark" ? <path d="M9 2a7 7 0 0 1 0 14Z" fill="currentColor" /> : null}
      <path d="M9 2v14" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}


export type Page = "docs" | "gallery" | "examples";

const NAV: [Page, string, string][] = [
  ["docs", "Docs", "/"],
  ["gallery", "Gallery", "/gallery/"],
  ["examples", "Examples", "/examples/"],
];

/** Page column widths. The header aligns with the page's column. */
export const WIDTH = { column: "max-w-3xl", wide: "max-w-[1400px]" } as const;

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

function NpmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M1.8 1.8v20.4h20.4V1.8zm16.6 16.6h-3.7V9.1h-3.7v9.3H5.6V5.6h12.8z" />
    </svg>
  );
}

const RENDERERS: { value: Renderer | "auto"; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "native", label: "Native" },
  { value: "twemoji", label: "Twemoji" },
];

function RendererSelect({ renderer, onRenderer, className }: { renderer: Renderer | "auto"; onRenderer: (r: Renderer | "auto") => void; className?: string }) {
  return (
    <Select items={RENDERERS} value={renderer} onValueChange={(v) => v && onRenderer(v as Renderer | "auto")}>
      <SelectTrigger aria-label="Renderer" className={cn("min-w-[104px] max-sm:h-10", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RENDERERS.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function IconLink({ href, label, children, className }: { href: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground max-sm:size-10", className)}>
      {children}
    </a>
  );
}

function SiteHeader({ page, theme, onTheme, renderer, onRenderer }: { page: Page; width: keyof typeof WIDTH; theme: Theme; onTheme: () => void; renderer: Renderer | "auto"; onRenderer: (r: Renderer | "auto") => void }) {
  const [menu, setMenu] = React.useState(false);
  const themeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    // Full width, no rule: shadcn's header (64px, 24px gutters, page background).
    <header className="sticky top-0 z-40 bg-background">
      <div className="flex h-16 items-center gap-1 px-4 sm:gap-2 sm:px-6">
        <nav aria-label="Main" className="flex items-center gap-0.5 max-sm:hidden">
          {NAV.map(([id, label, href]) => (
            <a key={id} href={href} aria-current={id === page ? "page" : undefined} className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2.5 text-sm font-medium", id === page ? "text-foreground" : "text-foreground/70 hover:text-foreground")}>
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <RendererSelect renderer={renderer} onRenderer={onRenderer} className="max-sm:hidden" />
          <Separator orientation="vertical" className="mx-1 h-4 self-center max-sm:hidden" />
          <IconLink href="https://github.com/BrianHung/EmojiPicker" label="GitHub">
            <GitHubIcon />
          </IconLink>
          <IconLink href="https://www.npmjs.com/package/@brianhung/emoji-picker" label="npm" className="max-sm:hidden">
            <NpmIcon />
          </IconLink>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={onTheme} aria-label={themeLabel} className="text-muted-foreground max-sm:size-10" />}>
              <ThemeIcon theme={theme} />
            </TooltipTrigger>
            <TooltipContent side="bottom">{themeLabel}</TooltipContent>
          </Tooltip>
          <Sheet open={menu} onOpenChange={setMenu}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Menu" className="size-10 text-muted-foreground sm:hidden" />}>
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] gap-0 p-0">
              <SheetHeader className="h-16 justify-center px-4">
                <SheetTitle>Emoji Picker</SheetTitle>
              </SheetHeader>
              <nav aria-label="Main" className="flex flex-col px-2">
                {[...NAV.map(([id, label, href]) => ({ id, label, href, indent: false })), { id: "tiptap", label: "Tiptap", href: "/examples/tiptap/", indent: true }, { id: "lexical", label: "Lexical", href: "/examples/lexical/", indent: true }].map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    aria-current={item.id === page ? "page" : undefined}
                    className={cn(buttonVariants({ variant: "ghost" }), "h-11 justify-start px-2 text-[15px]", item.indent && "pl-6", item.id === page ? "font-medium text-foreground" : "font-normal text-muted-foreground")}
                  >
                    {item.label}
                  </a>
                ))}
                <a href="https://www.npmjs.com/package/@brianhung/emoji-picker" target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "ghost" }), "h-11 justify-start px-2 text-[15px] font-normal text-muted-foreground")}>
                  npm
                </a>
              </nav>
              <Separator className="my-3" />
              <div className="flex items-center justify-between gap-3 px-4 text-[15px] text-muted-foreground">
                Renderer
                <RendererSelect renderer={renderer} onRenderer={onRenderer} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

const RendererContext = React.createContext<Renderer | "auto">("auto");
/** The renderer picked in the header. */
export const useRenderer = () => React.useContext(RendererContext);

export function SiteShell({ page, width = "column", children }: { page: Page; width?: keyof typeof WIDTH; children: React.ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  const [renderer, setRenderer] = React.useState<Renderer | "auto">(() => read("demo:renderer", "auto") as Renderer | "auto");
  React.useEffect(() => write("demo:renderer", renderer), [renderer]);
  return (
    <TooltipProvider>
    <RendererContext.Provider value={renderer}>
      {/* Remount on renderer change: provider options are read once. */}
      <EmojiProvider key={renderer} data={enUrl} renderer={renderer}>
        <SiteHeader page={page} width={width} theme={theme} onTheme={toggleTheme} renderer={renderer} onRenderer={setRenderer} />
        {children}
      </EmojiProvider>
    </RendererContext.Provider>
    </TooltipProvider>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border pt-6 pb-10 text-xs text-muted-foreground">
      Emoji data from emojibase · Slack shortcodes from iamcal · Twemoji graphics by Twitter and jdecked, CC-BY 4.0
    </footer>
  );
}
