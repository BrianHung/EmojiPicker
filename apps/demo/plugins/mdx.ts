import mdxRollup from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import type { Plugin } from "vite";

type Node = { type: string; lang?: string | null; meta?: string | null; value?: string; depth?: number; data?: { hProperties?: Record<string, string> }; children?: Node[]; [key: string]: unknown };

const walk = (node: Node, visit: (child: Node, parent: Node, index: number) => void) =>
  node.children?.forEach((child, i) => {
    visit(child, node, i);
    walk(child, visit);
  });

/** Fenced code becomes `<Code lang code title label />`: ```tsx title="editor.tsx" keeps its file name, label="…" names its tab in a CodeTabs. */
function remarkCode() {
  const attr = (name: string, value: string) => ({ type: "mdxJsxAttribute", name, value });
  return (tree: Node) =>
    walk(tree, (child, parent, i) => {
      if (child.type !== "code") return;
      const meta = [...(child.meta ?? "").matchAll(/(\w+)="([^"]*)"/g)].map(([, key, value]) => attr(key!, value!));
      parent.children![i] = {
        type: "mdxJsxFlowElement",
        name: "Code",
        attributes: [attr("lang", child.lang ?? "tsx"), attr("code", child.value ?? ""), ...meta],
        children: [],
      };
    });
}

/** `### Title {#id}` sets the heading's id. MDX would read `{#id}` as an expression, so the plugin escapes it first. */
const HEADING_ID = /^(#{1,6} .*) \{#([\w-]+)\}$/gm;

function remarkHeadingId() {
  return (tree: Node) =>
    walk(tree, (child) => {
      const last = child.type === "heading" ? child.children?.at(-1) : undefined;
      const match = last?.type === "text" ? last.value!.match(/\s*\{#([\w-]+)\}$/) : null;
      if (!last || !match) return;
      last.value = last.value!.slice(0, match.index);
      child.data = { ...child.data, hProperties: { id: match[1]! } };
    });
}

/** MDX pages: `export const frontmatter` from the YAML header, components passed by the page. */
export function mdx(): Plugin {
  // @mdx-js/rollup is typed against Rollup; Vite 8 runs it on Rolldown unchanged.
  const plugin = mdxRollup({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkCode, remarkHeadingId] }) as unknown as Plugin & { transform: Extract<Plugin["transform"], Function> };
  return {
    ...plugin,
    enforce: "pre",
    transform(code, id, options) {
      return plugin.transform.call(this, id.endsWith(".mdx") ? code.replace(HEADING_ID, "$1 \\{#$2\\}") : code, id, options);
    },
  };
}
