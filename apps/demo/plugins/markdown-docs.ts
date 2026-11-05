// Markdown copies of the docs pages, for "Copy Page" and LLMs: /docs.md (the package README),
// /examples.md, /examples/<name>.md (each example's page.mdx) and /llms.txt. Built from the
// sources on every request (dev) and at build (emitted assets), so they never drift.
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const SITE = "https://emoji.brianhung.me";
const GITHUB = "https://github.com/BrianHung/EmojiPicker/blob/main";
const EXAMPLES = ["tiptap", "lexical", "custom-emoji", "semantic-search", "virtualizer"];

const read = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

/** README links are relative to packages/emoji-picker; make them absolute GitHub URLs. */
function readme(text: string) {
  return text.replace(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g, (_, link: string) => `](${GITHUB}/${posix.normalize(posix.join("packages/emoji-picker", link))})`);
}

type Page = { title: string; description: string; body: string };

/** `<Code title code={file} />` with `import file from "./file.tsx?raw"` as the fenced block it shows. */
function inlineSources(dir: string, mdx: string) {
  const files = Object.fromEntries([...mdx.matchAll(/^import (\w+) from "(\.[^"]+)\?raw";$/gm)].map(([, id, path]) => [id!, path!]));
  return mdx.replace(/^<Code title="([^"]*)" code=\{(\w+)\} \/>$/gm, (line, title: string, id: string) => {
    const path = files[id];
    return path ? `\`\`\`${posix.extname(path).slice(1)} title="${title}"\n${read(posix.join(dir, path)).trim()}\n\`\`\`` : line;
  });
}

/** An MDX page as Markdown: frontmatter, then the body without its imports and JSX-only lines (the live demos). */
function page(name: string): Page {
  const dir = `src/pages/examples/${name}`;
  const source = inlineSources(dir, read(`${dir}/page.mdx`));
  const [, yaml = "", rest = source] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  const meta = Object.fromEntries(yaml.split("\n").map((line) => line.split(/:\s*(.*)/s).slice(0, 2)));
  let fenced = false;
  const body = rest
    .split("\n")
    .filter((line) => {
      if (line.startsWith("```")) fenced = !fenced;
      return fenced || !/^(import|export) |^<[A-Z].*\/>$/.test(line);
    })
    .join("\n")
    .replace(/\]\(\//g, `](${SITE}/`)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title: meta.title ?? name, description: meta.description ?? "", body };
}

function example(name: string) {
  const { title, description, body } = page(name);
  return `# ${title}\n\n${description}\n\nLive example: ${SITE}/examples/${name}/\n\n${body}\n`;
}

const index = (link: (name: string) => string) =>
  EXAMPLES.map((name) => {
    const { title, description } = page(name);
    return `- [${title}](${link(name)}): ${description}`;
  }).join("\n");

type Route = { type: "text/markdown" | "text/plain"; render: () => string };

const ROUTES: Record<string, Route> = {
  "docs.md": { type: "text/markdown", render: () => readme(read("../../packages/emoji-picker/README.md")) },
  "examples.md": { type: "text/markdown", render: () => `# Examples\n\nWorking integrations to copy into your app.\n\n${index((name) => `${SITE}/examples/${name}.md`)}\n` },
  ...Object.fromEntries(EXAMPLES.map((name) => [`examples/${name}.md`, { type: "text/markdown", render: () => example(name) } satisfies Route])),
  "llms.txt": {
    type: "text/plain",
    render: () => `# Emoji Picker

> Virtualized, unstyled React components for emoji pickers, tapbacks, and shortcode autocomplete (@brianhung/emoji-picker).

## Docs

- [Emoji Picker](${SITE}/docs.md): installation, parts, search, styling and API.

## Examples

- [Examples](${SITE}/examples.md): index of the integrations.
${index((name) => `${SITE}/examples/${name}.md`)}
`,
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
      // Once, with the pages: not again in the Worker's build environment.
      if (this.environment && this.environment.name !== "client") return;
      for (const [fileName, route] of Object.entries(ROUTES)) this.emitFile({ type: "asset", fileName, source: route.render() });
    },
  };
}
