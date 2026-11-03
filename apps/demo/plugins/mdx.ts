import mdxRollup from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import type { Plugin } from "vite";

type Node = { type: string; lang?: string | null; meta?: string | null; value?: string; children?: Node[]; [key: string]: unknown };

/** Fenced code becomes `<Code lang title code />`: ```tsx title="editor.tsx" keeps its file name. */
function remarkCode() {
  const attr = (name: string, value: string) => ({ type: "mdxJsxAttribute", name, value });
  const walk = (node: Node) =>
    node.children?.forEach((child, i) => {
      if (child.type !== "code") return walk(child);
      const title = child.meta?.match(/title="([^"]*)"/)?.[1];
      node.children![i] = {
        type: "mdxJsxFlowElement",
        name: "Code",
        attributes: [attr("lang", child.lang ?? "tsx"), attr("code", child.value ?? ""), ...(title ? [attr("title", title)] : [])],
        children: [],
      };
    });
  return walk;
}

/** MDX pages: `export const frontmatter` from the YAML header, components passed by the page. */
export function mdx(): Plugin {
  // @mdx-js/rollup is typed against Rollup; Vite 8 runs it on Rolldown unchanged.
  const plugin = mdxRollup({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkCode] }) as unknown as Plugin;
  return { ...plugin, enforce: "pre" };
}
