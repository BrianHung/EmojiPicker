import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import * as api from "../src/docs/api";
import { apiReference, type PartReference } from "./api-reference";
import type { PropRow } from "../src/components/site/docs";
import { EXAMPLES } from "../src/lib/examples";
import { PAGES, pageUrl, SITE } from "./site";

const NAMES = EXAMPLES.map((e) => e.id);
const tables = api as unknown as Record<string, PropRow[] | string[][]>;

const read = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const sourcePath = (dir: string, path: string) => (path.startsWith("@/registry/") ? path.slice(2) : path.startsWith("@/") ? `src/${path.slice(2)}` : posix.join(dir, path));

const cell = (text = "") => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
const table = (head: string[], rows: string[][]) => [head, head.map(() => "---"), ...rows].map((r) => `| ${r.map(cell).join(" | ")} |`).join("\n");
const code = (text: string) => `\`${text}\``;

// Descriptions and defaults are Markdown already: they write their code in backticks
const propsTable = (rows: PropRow[]) =>
  table(
    ["Prop", "Type", "Default", "Description"],
    rows.map((r) => [code(r.name), code(r.type), r.default ?? "", r.description ?? ""]),
  );

function partApi(part: string, rows: PropRow[] | undefined, reference: PartReference | undefined) {
  if (!rows && !reference) throw new Error(`markdown-docs: no API reference for ${part}`);
  return [
    ...(rows?.length ? [propsTable(rows)] : []),
    ...(reference?.attributes.length
      ? [
          table(
            ["Data attribute", "Type", "Description"],
            reference.attributes.map(([name, type, description]) => [code(name!), type === "—" ? type : code(type!), description!]),
          ),
        ]
      : []),
    ...(reference?.variables.length
      ? [
          table(
            ["CSS variable", "Default", "Description"],
            reference.variables.map(([name, value, description]) => [code(name!), value!, description!]),
          ),
        ]
      : []),
  ];
}

// MDX components become Markdown: tables from docs/api and the generated API reference, code from ?raw imports, and layout wrappers dropped
function toMarkdown(dir: string, mdx: string, used: Set<string>) {
  // Read on each render, so edits to a part's attribute files show in dev
  const parts = apiReference();
  const files = Object.fromEntries([...mdx.matchAll(/^import (\w+) from "((?:\.|@\/)[^"]+)\?raw";$/gm)].map(([, id, path]) => [id!, sourcePath(dir, path!)]));
  let fenced = false;
  let step = 0;
  return mdx
    .split("\n")
    .flatMap((line) => {
      if (line.startsWith("```")) fenced = !fenced;
      if (fenced || line.startsWith("```")) return [line];
      const trimmed = line.trim();
      let m: RegExpMatchArray | null;
      if ((m = trimmed.match(/^<Code title="([^"]*)"(?: label="[^"]*")? code=\{(\w+)\} \/>$/)) && files[m[2]!]) return [`\`\`\`${posix.extname(files[m[2]!]!).slice(1)} title="${m[1]}"`, read(files[m[2]!]!).trim(), "```"];
      if ((m = trimmed.match(/^<Demo name="([\w-]+)"[^>]*>$/))) return ['```tsx title="index.tsx"', read(`src/components/demos/${m[1]}/tailwind.tsx`).trim(), "```"];
      if ((m = trimmed.match(/^<PackageManagers dlx="([^"]+)" \/>$/))) return ["```bash", `npx ${m[1]}`, "```"];
      if ((m = trimmed.match(/^<PackageManagers install="([^"]+)" \/>$/))) return ["```bash", `npm install ${m[1]}`, "```"];
      if ((m = trimmed.match(/^<PropsTable rows=\{api\.(\w+)\} \/>$/))) return [propsTable(tables[m[1]!] as PropRow[])];
      if ((m = trimmed.match(/^<PartApi part="(\w+)"(?: props=\{api\.(\w+)\})? \/>$/))) {
        used.add(m[1]!);
        return partApi(m[1]!, m[2] ? (tables[m[2]] as PropRow[]) : undefined, parts[m[1]!]).flatMap((t) => [t, ""]);
      }
      if ((m = trimmed.match(/^<AttrTable head=\{(\[.*\])\} rows=\{api\.(\w+)\} \/>$/)))
        return [
          table(
            JSON.parse(m[1]!),
            (tables[m[2]!] as string[][]).map(([first, ...rest]) => [code(first!), ...rest]),
          ),
        ];
      if ((m = trimmed.match(/^<DefList rows=\{api\.(\w+)\} \/>$/))) return (tables[m[1]!] as string[][]).map(([term, description]) => `- ${code(term!)}: ${description}`);
      if (trimmed === "<Steps>") step = 0;
      if ((m = trimmed.match(/^<Step title="([^"]+)"\s*\/?>$/))) return [`${++step}. ${m[1]}`];
      if ((m = trimmed.match(/^<TabPanel label="([^"]+)">$/))) return [`### ${m[1]}`];
      if (/^(import|export) /.test(line) || /^<\/?[A-Za-z][\w.]*(\s[^>]*)?\/?>$/.test(trimmed)) return [];
      return [line.replace(/\s*\{#[\w-]+\}$/, "").replace(/<span [^>]*\/>/g, "")];
    })
    .join("\n")
    .replace(/\]\(\//g, `](${SITE}/`)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Page = { title: string; description: string; body: string };

function page(dir: string, used = new Set<string>()): Page {
  const source = read(`${dir}/page.mdx`);
  const [, yaml = "", rest = source] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  const meta = Object.fromEntries(yaml.split("\n").map((line) => line.split(/:\s*(.*)/s).slice(0, 2)));
  return { title: meta.title ?? dir, description: meta.description ?? "", body: toMarkdown(dir, rest, used) };
}

// Every part with data attributes or CSS variables has a block on the docs page
function docs() {
  const used = new Set<string>();
  const home = page("src/pages/home", used);
  const missing = Object.keys(apiReference()).filter((part) => !used.has(part));
  if (missing.length) throw new Error(`markdown-docs: no API reference block for ${missing.join(", ")}`);
  return home;
}
const example = (name: string) => page(`src/pages/examples/${name}`);

function document(p: Page, url: string) {
  return `# ${p.title}\n\n${p.description}\n\n${url}\n\n${p.body}\n`;
}

const index = (link: (name: string) => string) =>
  NAMES.map((name) => {
    const { title, description } = example(name);
    return `- [${title}](${link(name)}): ${description}`;
  }).join("\n");

type Route = { type: "text/markdown" | "text/plain" | "application/xml"; render: () => string };

export const ROUTES: Record<string, Route> = {
  "docs.md": { type: "text/markdown", render: () => document(docs(), `Live docs: ${SITE}/`) },
  "examples.md": { type: "text/markdown", render: () => `# Examples\n\nRecipes and integrations to copy into your app.\n\n${index((name) => `${SITE}/examples/${name}.md`)}\n` },
  ...Object.fromEntries(NAMES.map((name) => [`examples/${name}.md`, { type: "text/markdown", render: () => document(example(name), `Live example: ${SITE}/examples/${name}/`) } satisfies Route])),
  "llms.txt": {
    type: "text/plain",
    render: () => `# Emoji Components

> ${docs().description.replace(/\.$/, "")} (emoji-components).

## Docs

- [Emoji Components](${SITE}/docs.md): installation, usage, anatomy, examples, and the API reference of every part.
- [Registry](${SITE}/r/registry.json): shadcn/ui items for the picker, a popover on shadcn/ui, React Aria, or Floating UI, the suggestions menu on Floating UI, and the reaction bar.

## Examples

- [Examples](${SITE}/examples.md): index of the recipes and integrations.
${index((name) => `${SITE}/examples/${name}.md`)}
- [Source examples](https://github.com/BrianHung/emoji-components/tree/main/examples): a popover that stays open, a provider, search, a command palette, rendering, and cells, as files to copy.
`,
  },
  "robots.txt": { type: "text/plain", render: () => `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n` },
  "sitemap.xml": {
    type: "application/xml",
    render: () =>
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.values(PAGES)
        .map((page) => `  <url><loc>${pageUrl(page)}</loc></url>`)
        .join("\n")}\n</urlset>\n`,
  },
};

export function markdownDocs(): Plugin {
  return {
    name: "markdown-docs",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const route = ROUTES[(req.url ?? "").split("?")[0]!.replace(/^\//, "")];
        if (!route) return next();
        res.setHeader("Content-Type", `${route.type}; charset=utf-8`);
        res.end(route.render());
      });
    },
    generateBundle() {
      if (this.environment && this.environment.name !== "client") return;
      for (const [fileName, route] of Object.entries(ROUTES)) this.emitFile({ type: "asset", fileName, source: route.render() });
    },
  };
}
