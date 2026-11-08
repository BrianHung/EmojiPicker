import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import * as api from "../src/docs/api";
import { apiReference } from "./api-reference";
import type { PropRow } from "../src/components/site/docs";
import { EXAMPLES } from "../src/lib/examples";
import { PAGES, pageUrl, SITE } from "./site";

const NAMES = EXAMPLES.map((e) => e.id);
// Read on each render, so edits to a part's attribute files show in dev
const tables = (): Record<string, PropRow[] | string[][]> => ({ ...(api as unknown as Record<string, PropRow[] | string[][]>), ...apiReference() });

const read = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const sourcePath = (dir: string, path: string) => (path.startsWith("@/registry/") ? path.slice(2) : path.startsWith("@/") ? `src/${path.slice(2)}` : posix.join(dir, path));

const cell = (text = "") => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
const table = (head: string[], rows: string[][]) => [head, head.map(() => "---"), ...rows].map((r) => `| ${r.map(cell).join(" | ")} |`).join("\n");

function propsTable(rows: PropRow[]) {
  return table(
    ["Prop", "Type", "Default", "Description"],
    rows.map((r) => [`\`${r.name}\``, `\`${r.type}\``, r.default ? `\`${r.default}\`` : "", String(r.description ?? "")]),
  );
}

// MDX components become Markdown: tables from docs/api and the generated API reference, code from ?raw imports, and layout wrappers dropped
function toMarkdown(dir: string, mdx: string) {
  const TABLES = tables();
  const files = Object.fromEntries([...mdx.matchAll(/^import (\w+) from "((?:\.|@\/)[^"]+)\?raw";$/gm)].map(([, id, path]) => [id!, sourcePath(dir, path!)]));
  let fenced = false;
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
      if ((m = trimmed.match(/^<PropsTable rows=\{(?:api|ref)\.(\w+)\} \/>$/))) return [propsTable(TABLES[m[1]!] as PropRow[])];
      if ((m = trimmed.match(/^<AttrTable head=\{(\[.*\])\} rows=\{(?:api|ref)\.(\w+)\} \/>$/)))
        return [
          table(
            JSON.parse(m[1]!),
            // As in AttrTable: the first column, and the second of three, are code
            (TABLES[m[2]!] as string[][]).map(([first, ...rest]) => [`\`${first}\``, ...(rest.length === 2 ? [`\`${rest[0]}\``, rest[1]!] : rest)]),
          ),
        ];
      if ((m = trimmed.match(/^<DefList rows=\{api\.(\w+)\} \/>$/))) return (TABLES[m[1]!] as string[][]).map(([term, description]) => `- \`${term}\`: ${description}`);
      if ((m = trimmed.match(/^<Step title="([^"]+)">$/))) return [`**${m[1]}**`];
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

function page(dir: string): Page {
  const source = read(`${dir}/page.mdx`);
  const [, yaml = "", rest = source] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  const meta = Object.fromEntries(yaml.split("\n").map((line) => line.split(/:\s*(.*)/s).slice(0, 2)));
  return { title: meta.title ?? dir, description: meta.description ?? "", body: toMarkdown(dir, rest) };
}

const docs = () => page("src/pages/home");
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
  "examples.md": { type: "text/markdown", render: () => `# Examples\n\nIntegrations to copy into your app.\n\n${index((name) => `${SITE}/examples/${name}.md`)}\n` },
  ...Object.fromEntries(NAMES.map((name) => [`examples/${name}.md`, { type: "text/markdown", render: () => document(example(name), `Live example: ${SITE}/examples/${name}/`) } satisfies Route])),
  "llms.txt": {
    type: "text/plain",
    render: () => `# Emoji Picker

> ${docs().description.replace(/\.$/, "")} (@brianhung/emoji-picker-react).

## Docs

- [Emoji Picker](${SITE}/docs.md): installation, anatomy, usage, examples, API reference, and accessibility.

## Examples

- [Examples](${SITE}/examples.md): index of the integrations.
${index((name) => `${SITE}/examples/${name}.md`)}
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
