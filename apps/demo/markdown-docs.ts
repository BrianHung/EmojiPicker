// Markdown copies of the docs pages, for "Copy Page" and LLMs: /docs.md, /examples.md,
// /examples/tiptap.md, /examples/lexical.md and /llms.txt. Built from the source files
// on every request (dev) and at build (emitted assets), so they never drift.
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const SITE = "https://emoji.brianhung.me";
const GITHUB = "https://github.com/BrianHung/EmojiPicker/blob/main";

const demo = (path: string) => fileURLToPath(new URL(`./${path}`, import.meta.url));
const read = (path: string) => readFileSync(demo(path), "utf8");

/** README links are relative to packages/emoji-picker; make them absolute GitHub URLs. */
function readme(text: string) {
  return text.replace(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g, (_, link: string) => {
    const path = posix.normalize(posix.join("packages/emoji-picker", link));
    return `](${GITHUB}/${path})`;
  });
}

/** A template literal assigned to `const NAME = \`…\`;` in a page, unescaped. */
function constant(source: string, name: string) {
  const match = source.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
  return (match?.[1] ?? "").replace(/\\`/g, "`").replace(/\\\$/g, "$");
}

function editor(page: string, name: "Tiptap" | "Lexical", dir: string, file: string, summary: string, how: string) {
  return `# ${name}

${summary}

Live example: ${SITE}/examples/${dir}/

## Usage

\`\`\`tsx
${constant(page, "USAGE").trim()}
\`\`\`

## ${file}

${how}

\`\`\`tsx
${read(`examples/${dir}/${file}`).trim()}
\`\`\`
`;
}

/**
 * Route → Markdown. Each route names its source file (relative to apps/demo) and a
 * `toMarkdown(source)` transform; a route without a source is generated whole. To move
 * a page to MDX, point `source` at the .mdx file and swap its transform.
 */
type Route = { type: "text/markdown" | "text/plain"; source?: string; toMarkdown: (source: string) => string };

export const ROUTES: Record<string, Route> = {
  "docs.md": { type: "text/markdown", source: "../../packages/emoji-picker/README.md", toMarkdown: readme },
  "examples.md": {
    type: "text/markdown",
    toMarkdown: () => `# Examples

The emoji picker inside rich-text editors.

- [Tiptap](${SITE}/examples/tiptap.md): shortcode suggestions and an emoji picker for the Tiptap editor.
- [Lexical](${SITE}/examples/lexical.md): shortcode suggestions and an emoji picker for the Lexical editor.
`,
  },
  "examples/tiptap.md": {
    type: "text/markdown",
    source: "examples/tiptap/main.tsx",
    toMarkdown: (page) =>
      editor(
        page,
        "Tiptap",
        "tiptap",
        "emoji-suggestion.tsx",
        "Shortcode suggestions and an emoji picker for the Tiptap editor, built on `@brianhung/emoji-picker`.",
        "The extension passes the query from `@tiptap/suggestion` to `useEmojiSuggestions` and positions the menu at the caret with `EmojiPopover`. Copy this file into your project.",
      ),
  },
  "examples/lexical.md": {
    type: "text/markdown",
    source: "examples/lexical/main.tsx",
    toMarkdown: (page) =>
      editor(
        page,
        "Lexical",
        "lexical",
        "emoji-typeahead-plugin.tsx",
        "Shortcode suggestions and an emoji picker for the Lexical editor, built on `@brianhung/emoji-picker`.",
        "Lexical's typeahead menu handles the trigger, caret position and keyboard. `useEmojiSuggestions` supplies the ranked options and the text to insert. Copy this file into your project.",
      ),
  },
  "llms.txt": {
    type: "text/plain",
    toMarkdown: () => `# Emoji Picker

> Unstyled React parts for emoji pickers, tapbacks and shortcode autocomplete (@brianhung/emoji-picker).

## Docs

- [Emoji Picker](${SITE}/docs.md): installation, parts, search, styling and API.

## Examples

- [Examples](${SITE}/examples.md): index of the editor integrations.
- [Tiptap](${SITE}/examples/tiptap.md): Tiptap extension with shortcode suggestions.
- [Lexical](${SITE}/examples/lexical.md): Lexical typeahead plugin with shortcode suggestions.
`,
  },
};

const render = (route: Route) => route.toMarkdown(route.source ? read(route.source) : "");

export function markdownDocs(): Plugin {
  return {
    name: "markdown-docs",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0]!.replace(/^\//, "");
        const route = ROUTES[path];
        if (!route) return next();
        res.setHeader("Content-Type", `${route.type}; charset=utf-8`);
        res.end(render(route));
      });
    },
    generateBundle() {
      for (const [fileName, route] of Object.entries(ROUTES)) this.emitFile({ type: "asset", fileName, source: render(route) });
    },
  };
}
