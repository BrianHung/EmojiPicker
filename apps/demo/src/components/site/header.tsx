// The site header: nav, renderer select, GitHub and npm links, theme toggle; on phones, a
// "Menu" button opening a full-screen sheet.
import * as React from "react";
import type { Renderer } from "@brianhung/emoji-picker";
import { MenuIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EXAMPLES } from "@/lib/examples";
import { cn } from "@/lib/utils";
import { GitHubIcon, NpmIcon } from "./brand-icons";
import type { Page, Theme } from "./shell";

const NAV: [Page, string, string][] = [
  ["docs", "Docs", "/"],
  ["gallery", "Gallery", "/gallery/"],
  ["examples", "Examples", "/examples/"],
];

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
        <SelectGroup>
          {RENDERERS.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectGroup>
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

export function SiteHeader({ page, theme, onTheme, renderer, onRenderer }: { page: Page; theme: Theme; onTheme: () => void; renderer: Renderer | "auto"; onRenderer: (r: Renderer | "auto") => void }) {
  const [menu, setMenu] = React.useState(false);
  const themeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    // Full width, no rule: shadcn's header (64px, 24px gutters, page background).
    <header className="sticky top-0 z-40 bg-background">
      <div className="flex h-16 items-center gap-1 px-4 sm:gap-2 sm:px-6">
        <MobileMenu page={page} open={menu} onOpenChange={setMenu} renderer={renderer} onRenderer={onRenderer} />
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
        </div>
      </div>
    </header>
  );
}

const MENU: { label: string; links: { id: string; label: string; href: string }[] }[] = [
  { label: "Menu", links: NAV.map(([id, label, href]) => ({ id, label, href })) },
  {
    label: "Examples",
    links: EXAMPLES.map((e) => ({ id: e.id, label: e.title, href: e.href })),
  },
];

/** shadcn's mobile menu: a "Menu" button on the left opening a full-screen sheet of grouped links. */
function MobileMenu({ page, open, onOpenChange, renderer, onRenderer }: { page: Page; open: boolean; onOpenChange: (open: boolean) => void; renderer: Renderer | "auto"; onRenderer: (r: Renderer | "auto") => void }) {
  const current = typeof location === "undefined" ? "" : location.pathname;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger render={<Button variant="ghost" className="-ml-2 h-10 gap-2 px-2 text-[15px] font-medium sm:hidden" />}>
        <MenuIcon />
        Menu
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 overflow-y-auto p-0 data-[side=left]:w-full data-[side=left]:border-r-0">
        <SheetHeader className="h-16 flex-row items-center px-4">
          <SheetTitle className="text-[15px] font-medium">Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Main" className="flex flex-col gap-8 px-6 pt-4 pb-10">
          {MENU.map((group) => (
            <div key={group.label} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{group.label}</p>
              {group.links.map((link) => {
                const active = link.id === page || current === link.href;
                return (
                  <a key={link.id} href={link.href} aria-current={active ? "page" : undefined} className={cn("text-2xl font-medium tracking-tight", active ? "text-foreground" : "text-foreground/80 hover:text-foreground")}>
                    {link.label}
                  </a>
                );
              })}
            </div>
          ))}
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Settings</p>
            <div className="flex items-center justify-between gap-3 text-base">
              Renderer
              <RendererSelect renderer={renderer} onRenderer={onRenderer} />
            </div>
            <a href="https://www.npmjs.com/package/@brianhung/emoji-picker" target="_blank" rel="noreferrer" className="text-base text-foreground/80 hover:text-foreground">
              npm
            </a>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
