// Docs-page primitives in the shadcn/ui + Base UI docs style: headings the TOC reads,
// underline tabs, preview cards, tabbed code panels, steps and API tables.
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs as ShadTabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CodeBlock, CopyButton, type Lang } from "./code";

/* ------------------------------------------------------------------ headings */

function Anchor({ id }: { id: string }) {
  return (
    <a href={`#${id}`} aria-label="Link to this section" className="ml-2 text-muted-foreground/0 no-underline transition-colors group-hover:text-muted-foreground hover:!text-foreground">
      #
    </a>
  );
}

/** A section heading (h2). `data-toc` makes it a table-of-contents entry. */
export function H2({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} data-toc="2" className={cn("group scroll-mt-20 text-2xl font-semibold tracking-tight", className)}>
      {children}
      <Anchor id={id} />
    </h2>
  );
}

export function H3({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <h3 id={id} data-toc="3" className={cn("group scroll-mt-20 text-lg font-semibold tracking-tight", className)}>
      {children}
      <Anchor id={id} />
    </h3>
  );
}

export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[15px] leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/25 [&_a]:underline-offset-[5px] [&_a]:transition-colors [&_a:hover]:decoration-foreground [&_a:has(>code)]:underline-offset-[7px] [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">{children}</code>;
}

/* ---------------------------------------------------------------------- tabs */

export type TabItem<T extends string> = { value: T; label: React.ReactNode };

/**
 * Underline tabs: shadcn's Tabs (Base UI) with the `line` list. Page-level tabs follow
 * shadcn's docs (no rule under the strip, 16px labels, a 2px underline 4px below);
 * `bordered={false}` is the compact strip used in code-panel headers. Arrow keys,
 * Home and End move between tabs.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
  size = "md",
  bordered = true,
}: {
  value: T;
  onChange: (value: T) => void;
  items: TabItem<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
  bordered?: boolean;
}) {
  return (
    <ShadTabs value={value} onValueChange={(v) => onChange(v as T)} className={cn("max-w-full min-w-0 gap-0", !bordered && "self-stretch")}>
      <TabsList
        variant="line"
        aria-label={label}
        activateOnFocus
        className={cn("max-w-full justify-start overflow-x-auto rounded-none p-0 [scrollbar-width:none] group-data-horizontal/tabs:h-auto", bordered ? "gap-6 pb-1" : size === "md" ? "gap-5" : "gap-4", className)}
      >
        {items.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className={cn(
              "h-auto flex-none rounded-none border-0 px-0 font-medium text-muted-foreground hover:text-foreground focus-visible:ring-0 focus-visible:outline-none focus-visible:text-foreground data-active:text-foreground dark:text-muted-foreground dark:data-active:text-foreground",
              bordered
                ? // Base UI sets data-orientation, not the data-horizontal the shadcn group variants expect: place the underline directly.
                  "pt-1 pb-0.5 text-base after:inset-x-0 after:bottom-[-4px] after:h-0.5"
                : cn("after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full", size === "md" ? "min-h-10 pt-1 pb-2.5 text-sm" : "pt-0.5 pb-2 text-[13px] max-sm:min-h-10 max-sm:pt-3"),
            )}
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </ShadTabs>
  );
}

type PanelProps = { label: string; children: React.ReactNode };

export const TabPanel = ({ children }: PanelProps) => <>{children}</>;

/** Page-level tabs over `<TabPanel label>` children, showing the selected one. */
export function TabPanels({ label, children }: { label: string; children: React.ReactNode }) {
  const panels = React.Children.toArray(children).filter((child): child is React.ReactElement<PanelProps> => React.isValidElement(child));
  const [value, setValue] = React.useState(panels[0]!.props.label);
  return (
    <>
      <Tabs label={label} value={value} onChange={setValue} items={panels.map(({ props }) => ({ value: props.label, label: props.label }))} />
      {panels.find(({ props }) => props.label === value)}
    </>
  );
}

/* ------------------------------------------------------------- code panels */

export type CodeFile = { name: string; code: string; lang?: Lang };
/** One code tab: a single snippet, or several files (Base UI's "index.tsx | index.module.css"). */
export type CodeTab = { label: string; code?: string; lang?: Lang; file?: string; files?: CodeFile[] };

const filesOf = (tab: CodeTab): CodeFile[] => tab.files ?? [{ name: tab.file ?? tab.label, code: tab.code ?? "", lang: tab.lang }];

/**
 * A code card with tabs in its header (Base UI's "CSS Modules | Tailwind"), a row of
 * file names when a tab has several files, or a single file name. Long code
 * collapses behind "View Code". Controlled with `value`/`onChange`, or not.
 */
export function CodeTabs({ tabs, className, collapse = 0, defaultTab, value, onChange }: { tabs: CodeTab[]; className?: string; collapse?: number; defaultTab?: string; value?: string; onChange?: (label: string) => void }) {
  const [own, setOwn] = React.useState(defaultTab ?? tabs[0]!.label);
  const active = value ?? own;
  const setActive = (label: string) => {
    setOwn(label);
    onChange?.(label);
  };
  const tab = tabs.find((t) => t.label === active) ?? tabs[0]!;
  const files = filesOf(tab);
  const [fileName, setFileName] = React.useState(files[0]!.name);
  const file = files.find((f) => f.name === fileName) ?? files[0]!;
  const many = tabs.length > 1;
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-code", className)}>
      <div className="flex h-10 items-center gap-2 border-b border-border pr-1.5 pl-4">
        {many ? (
          <Tabs label="Code" size="sm" bordered={false} value={tab.label} onChange={setActive} items={tabs.map((t) => ({ value: t.label, label: t.label }))} className="-mb-px h-full items-end" />
        ) : files.length === 1 ? (
          <span className="truncate font-mono text-[12.5px] text-muted-foreground">{file.name}</span>
        ) : null}
        {many && tab.file ? <span className="ml-auto hidden truncate font-mono text-xs text-muted-foreground sm:block">{tab.file}</span> : null}
        <CopyButton text={file.code} className={cn("shrink-0", !(many && tab.file) && "ml-auto")} />
      </div>
      {files.length > 1 ? (
        <div className="flex h-9 items-center border-b border-border px-4">
          <Tabs
            label="File"
            size="sm"
            bordered={false}
            value={file.name}
            onChange={setFileName}
            items={files.map((f) => ({ value: f.name, label: <span className="font-mono text-xs">{f.name}</span> }))}
            className="-mb-px h-full items-end"
          />
        </div>
      ) : null}
      <Collapsible lines={file.code.trim().split("\n").length} collapse={collapse} resetKey={`${tab.label}:${file.name}`}>
        <CodeBlock code={file.code} lang={file.lang ?? "tsx"} />
      </Collapsible>
    </div>
  );
}

/** A fenced code block in MDX (`<Code lang code title label />`, plugins/mdx.ts) as a code tab: `label` names the tab, `title` is its file. */
export type CodeProps = { code: string; lang?: Lang; title?: string; label?: string };

export const codeTabsOf = (children: React.ReactNode): CodeTab[] =>
  React.Children.toArray(children)
    .filter((child): child is React.ReactElement<CodeProps> => React.isValidElement(child))
    .map(({ props: { code, lang, title, label } }) => ({ label: label ?? title ?? "", file: label ? title : undefined, code, lang }));

/** MDX's `<CodeTabs>`: one tab per fenced code block inside it. */
export const CodeBlockTabs = ({ children, ...props }: Omit<React.ComponentProps<typeof CodeTabs>, "tabs"> & { children: React.ReactNode }) => <CodeTabs tabs={codeTabsOf(children)} {...props} />;

const PACKAGE_MANAGERS = {
  pnpm: { install: "pnpm add", dlx: "pnpm dlx" },
  npm: { install: "npm install", dlx: "npx" },
  yarn: { install: "yarn add", dlx: "yarn dlx" },
  bun: { install: "bun add", dlx: "bunx --bun" },
};

/** A command in each package manager: `install` adds a package, `dlx` runs one. */
export function PackageManagers(command: { install: string } | { dlx: string }) {
  const tabs = Object.entries(PACKAGE_MANAGERS).map(([label, pm]) => ({ label, lang: "bash" as const, code: "install" in command ? `${pm.install} ${command.install}` : `${pm.dlx} ${command.dlx}` }));
  return <CodeTabs tabs={tabs} defaultTab="npm" />;
}

/** shadcn's collapsed code: a few faded lines and a "View code" button. */
export function Collapsible({ lines, collapse, resetKey, children }: { lines: number; collapse: number; resetKey?: unknown; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [resetKey]);
  const collapsible = collapse > 0 && lines > collapse + 2;
  if (!collapsible) return <>{children}</>;
  return (
    <div className="relative">
      <div className={cn(!open && "overflow-hidden")} style={open ? undefined : { maxHeight: `${collapse * 1.7 * 13 + 28}px` }}>
        {children}
      </div>
      {open ? (
        <div className="flex justify-center border-t border-border py-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-muted-foreground max-sm:h-10">
            Collapse
          </Button>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex h-full items-end justify-center bg-gradient-to-b from-transparent via-code/80 to-code pb-4">
          <Button variant="outline" onClick={() => setOpen(true)} className="shadow-xs max-sm:h-10">
            View Code
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ preview card */

/** The live preview surface: a bordered, rounded card that centers its content. */
export function Preview({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-background p-6 sm:p-10", className)}>{children}</div>;
}

/* ------------------------------------------------------------------ fitting */

/**
 * Scales fixed-size content down to fit the available width (and an optional height).
 * A transform, not CSS zoom: the virtualized grid measures its own width, which a
 * transform leaves alone.
 */
export function FitBox({ width, height, maxHeight = Infinity, children, className }: { width: number; height: number; maxHeight?: number; children: React.ReactNode; className?: string }) {
  const outer = React.useRef<HTMLDivElement>(null);
  const [available, setAvailable] = React.useState(width);
  React.useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, available / width, maxHeight / height);
  return (
    <div ref={outer} className={cn("flex w-full justify-center", className)}>
      <div style={{ width: width * scale, height: height * scale, flexShrink: 0, position: "relative" }}>
        <div style={{ width, height, position: "absolute", top: 0, left: 0, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}>{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- steps */

/** shadcn's numbered steps: a counter in a circle on a vertical rule. */
export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="relative ml-3.5 border-l border-border pl-7 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="relative pb-8 [counter-increment:step] last:pb-0 before:absolute before:top-0 before:-left-[calc(1.75rem+14px)] before:flex before:size-7 before:items-center before:justify-center before:rounded-full before:border before:border-border before:bg-background before:font-mono before:text-xs before:font-medium before:content-[counter(step)]">
      <h4 className="pt-0.5 font-medium">{title}</h4>
      {children ? <div className="mt-3 flex flex-col gap-3">{children}</div> : null}
    </li>
  );
}

/* -------------------------------------------------------------- API tables */

export type PropRow = { name: string; type: string; default?: string; description?: React.ReactNode };

function TableShell({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table className="min-w-[540px]">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            {head.map((h) => (
              <TableHead key={h} className="h-10 px-4 text-[13px] text-muted-foreground">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

const nameCell = "px-4 py-3 align-top font-mono text-[13px] whitespace-nowrap text-foreground";
const typeCell = "px-4 py-3 align-top font-mono text-[12.5px] whitespace-normal text-[color:var(--type)]";

/** Props: name, type, default, and the description on a second line (Base UI). */
export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <TableShell head={["Prop", "Type", "Default"]}>
      {rows.map((r) => (
        <TableRow key={r.name} className="hover:bg-transparent">
          <TableCell className={nameCell}>
            {r.name}
            {r.description ? <div className="mt-1 max-w-[260px] font-sans text-[13px] font-normal whitespace-normal text-muted-foreground">{r.description}</div> : null}
          </TableCell>
          <TableCell className={typeCell}>{r.type}</TableCell>
          <TableCell className="px-4 py-3 align-top font-mono text-[12.5px] text-muted-foreground">{r.default ?? "—"}</TableCell>
        </TableRow>
      ))}
    </TableShell>
  );
}

/** Two or three columns: an attribute or variable, and what it means. */
export function AttrTable({ head, rows }: { head: [string, string] | [string, string, string]; rows: (string | React.ReactNode)[][] }) {
  return (
    <TableShell head={head}>
      {rows.map((r, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {r.map((cell, j) => (
            <TableCell key={j} className={j === 0 ? nameCell : j === 1 && head.length === 3 ? typeCell : "px-4 py-3 align-top text-[13px] whitespace-normal text-muted-foreground"}>
              {cell}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableShell>
  );
}
