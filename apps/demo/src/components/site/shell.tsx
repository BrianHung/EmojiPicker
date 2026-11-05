import * as React from "react";
import enUrl from "@brianhung/emoji-picker-core/data/en.json?url";
import { EmojiProvider, type Renderer } from "@brianhung/emoji-picker";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SiteHeader } from "./header";

export type Theme = "light" | "dark";

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
  } catch {}
};

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

export type Page = "docs" | "gallery" | "examples";

export const WIDTH = { column: "max-w-3xl", wide: "max-w-[1400px]" } as const;

if (typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)) {
  document.documentElement.classList.add("apple");
}

const RendererContext = React.createContext<Renderer | "auto">("auto");
export const useRenderer = () => React.useContext(RendererContext);

export function SiteShell({ page, width = "column", children }: { page: Page; width?: keyof typeof WIDTH; children: React.ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  const [renderer, setRenderer] = React.useState<Renderer | "auto">(() => read("demo:renderer", "auto") as Renderer | "auto");
  React.useEffect(() => write("demo:renderer", renderer), [renderer]);
  return (
    <TooltipProvider>
      <RendererContext.Provider value={renderer}>
        <EmojiProvider data={enUrl} renderer={renderer}>
          <div className="flex min-h-svh flex-col">
            <SiteHeader page={page} theme={theme} onTheme={toggleTheme} renderer={renderer} onRenderer={setRenderer} />
            <div className="flex-1">{children}</div>
            <SiteFooter width={width} />
          </div>
          <Toaster />
        </EmojiProvider>
      </RendererContext.Provider>
    </TooltipProvider>
  );
}

function SiteFooter({ width }: { width: keyof typeof WIDTH }) {
  return (
    <footer className={cn("mx-auto w-full px-4 pt-24 pb-8 text-xs text-muted-foreground sm:px-6", WIDTH[width])}>
      <a href="https://github.com/jdecked/twemoji" className="underline decoration-current/30 underline-offset-4 transition-colors hover:text-foreground hover:decoration-current">
        Twemoji
      </a>{" "}
      graphics by Twitter and jdecked,{" "}
      <a href="https://creativecommons.org/licenses/by/4.0/" className="underline decoration-current/30 underline-offset-4 transition-colors hover:text-foreground hover:decoration-current">
        CC-BY 4.0
      </a>
      .
    </footer>
  );
}
