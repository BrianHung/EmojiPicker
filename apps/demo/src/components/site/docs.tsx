import * as React from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs as ShadTabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CodeBlock, CopyButton, type Lang } from "./code";

function Anchor({ id }: { id: string }) {
  return (
    <a href={`#${id}`} aria-label="Link to this section" className="ml-2 text-muted-foreground/0 no-underline transition-colors group-hover:text-muted-foreground hover:!text-foreground">
      #
    </a>
  );
}

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

export function H4({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <h4 id={id} className={cn("group scroll-mt-20 text-base font-semibold tracking-tight", className)}>
      {children}
      <Anchor id={id} />
    </h4>
  );
}

export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[15px] leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/25 [&_a]:underline-offset-[5px] [&_a]:transition-colors [&_a:hover]:decoration-foreground [&_a:has(>code)]:underline-offset-[7px]",
        className,
      )}
    >
      {children}
    </p>
  );
}

// Breaks only between the words of a code span, never inside an identifier or after its hyphens
const words = (text: string) =>
  text.split(/( +)/).map((w, i) =>
    i % 2 ? (
      w
    ) : (
      <span key={i} className="whitespace-nowrap">
        {w}
      </span>
    ),
  );

export function C({ children, className }: { children: React.ReactNode; className?: string }) {
  return <code className={cn("rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground [overflow-wrap:normal] [box-decoration-break:clone]", className)}>{typeof children === "string" ? words(children) : children}</code>;
}

// Prose with `code` spans, as the API tables write their descriptions
export function Inline({ text, codeClassName }: { text: string; codeClassName?: string }) {
  return text.split(/`([^`]+)`/).map((part, i) =>
    i % 2 ? (
      <C key={i} className={codeClassName}>
        {part}
      </C>
    ) : (
      part
    ),
  );
}

export type TabItem<T extends string> = { value: T; label: React.ReactNode };

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
                ? "pt-1 pb-0.5 text-base after:inset-x-0 after:bottom-[-4px] after:h-0.5"
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

export type CodeFile = { name: string; code: string; lang?: Lang };
export type CodeTab = { label: string; code?: string; lang?: Lang; file?: string; files?: CodeFile[] };

const filesOf = (tab: CodeTab): CodeFile[] => tab.files ?? [{ name: tab.file ?? tab.label, code: tab.code ?? "", lang: tab.lang }];

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

export type CodeProps = { code: string; lang?: Lang; title?: string; label?: string };

export const codeTabsOf = (children: React.ReactNode): CodeTab[] =>
  React.Children.toArray(children)
    .filter((child): child is React.ReactElement<CodeProps> => React.isValidElement(child))
    .map(({ props: { code, lang, title, label } }) => ({ label: label ?? title ?? "", file: label ? title : undefined, code, lang }));

export const CodeBlockTabs = ({ children, ...props }: Omit<React.ComponentProps<typeof CodeTabs>, "tabs"> & { children: React.ReactNode }) => <CodeTabs tabs={codeTabsOf(children)} {...props} />;

const PACKAGE_MANAGERS = {
  pnpm: { install: "pnpm add", dlx: "pnpm dlx" },
  npm: { install: "npm install", dlx: "npx" },
  yarn: { install: "yarn add", dlx: "yarn dlx" },
  bun: { install: "bun add", dlx: "bunx --bun" },
};

export function PackageManagers(command: { install: string } | { dlx: string }) {
  const tabs = Object.entries(PACKAGE_MANAGERS).map(([label, pm]) => ({ label, lang: "bash" as const, code: "install" in command ? `${pm.install} ${command.install}` : `${pm.dlx} ${command.dlx}` }));
  return <CodeTabs tabs={tabs} defaultTab="npm" />;
}

export function Collapsible({ lines, collapse, resetKey, children }: { lines: number; collapse: number; resetKey?: unknown; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new resetKey collapses it again
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

export function Preview({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-background p-6 sm:p-10", className)}>{children}</div>;
}

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

export type PropRow = { name: string; type: string; default?: string; description?: string };

function TableShell({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table className="max-sm:block max-sm:[&_tbody]:block max-sm:[&_td]:block max-sm:[&_td]:py-1 max-sm:[&_td:first-child]:pt-3 max-sm:[&_td:last-child]:pb-3 max-sm:[&_tr]:block">
        <TableHeader className="bg-muted/50 max-sm:hidden">
          <TableRow className="hover:bg-transparent">
            {head.map((h) => (
              <TableHead key={h} className="h-10 px-4 text-[13px] whitespace-nowrap text-muted-foreground max-sm:px-3">
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

const nameCell = "px-4 max-sm:px-3 py-3 align-top font-mono text-[13px] leading-5 text-foreground sm:whitespace-nowrap max-sm:whitespace-normal max-sm:[overflow-wrap:anywhere]";
const typeCell = "px-4 max-sm:px-3 py-3 align-top font-mono text-[12.5px] leading-5 whitespace-normal text-[color:var(--type)]";
const textCell = "px-4 py-3 align-top text-[13px] leading-5 whitespace-normal text-muted-foreground max-sm:px-3";
const tableCode = "bg-transparent px-0 py-0 text-[12.5px]";
const descriptionCode = "px-1 py-px text-[12.5px]";
const defaultCode = `${tableCode} whitespace-nowrap`;

// A description spans the row below its prop on wider screens, and stacks under the name on phones
export function PropsTable({ rows }: { rows: PropRow[] }) {
  const description = (text: string, className: string) => (
    <div className={cn("font-sans text-[13px] leading-6 font-normal whitespace-normal text-muted-foreground", className)}>
      <Inline text={text} codeClassName={descriptionCode} />
    </div>
  );
  return (
    <TableShell head={["Prop", "Type", "Default"]}>
      {rows.map((r) => (
        <React.Fragment key={r.name}>
          <TableRow className={cn("hover:bg-transparent", r.description && "sm:border-b-0")}>
            <TableCell className={nameCell}>
              {r.name}
              {r.description ? description(r.description, "mt-1 sm:hidden") : null}
            </TableCell>
            <TableCell className={typeCell}>{words(r.type)}</TableCell>
            <TableCell className={cn(textCell, "min-w-28", !r.default && "max-sm:!hidden", "max-sm:before:content-['Default:_']")}>{r.default ? <Inline text={r.default} codeClassName={defaultCode} /> : "—"}</TableCell>
          </TableRow>
          {r.description ? (
            <TableRow className="hover:bg-transparent max-sm:!hidden">
              <TableCell colSpan={3} className="px-4 pt-0 pb-3">
                {description(r.description, "max-w-2xl")}
              </TableCell>
            </TableRow>
          ) : null}
        </React.Fragment>
      ))}
    </TableShell>
  );
}

// The first column is code, a type column is code, and every other cell is prose with `code` spans
export function AttrTable({ head, rows, type = false }: { head: string[]; rows: string[][]; type?: boolean }) {
  return (
    <TableShell head={head}>
      {rows.map((r, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {r.map((cell, j) => (
            <TableCell key={j} className={j === 0 ? nameCell : type && j === 1 ? typeCell : cn(textCell, j === 1 && "min-w-28")}>
              {j === 0 ? cell : type && j === 1 ? words(cell) : <Inline text={cell} codeClassName={j === 1 ? tableCode : descriptionCode} />}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableShell>
  );
}

export function DefList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-border rounded-xl border border-border">
      {rows.map(([term, description]) => (
        <div key={term} className="flex flex-col gap-1.5 px-4 py-3">
          <dt className="font-mono text-[13px] [overflow-wrap:anywhere] text-foreground">{term}</dt>
          <dd className="text-[13px] leading-6 text-muted-foreground">
            <Inline text={description} codeClassName={descriptionCode} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
