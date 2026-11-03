import * as React from "react";
import { createRoot } from "react-dom/client";
import type { MDXComponents, MDXContent } from "mdx/types";
import { Code } from "./code";
import { PageHeader } from "./copy-page";
import { C, H2, H3, P } from "./docs";
import { DocsLayout } from "./docs-layout";
import { SiteShell } from "./shell";

const text = (node: React.ReactNode): string =>
  typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : React.isValidElement<{ children?: React.ReactNode }>(node) ? text(node.props.children) : "";

const slug = (node: React.ReactNode) =>
  text(node)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Markdown elements as the docs primitives. Fenced code arrives as <Code> (plugins/mdx.ts). */
const components: MDXComponents = {
  h2: ({ children }) => (
    <H2 id={slug(children)} className="mt-8 text-xl">
      {children}
    </H2>
  ),
  h3: ({ children }) => (
    <H3 id={slug(children)} className="mt-4">
      {children}
    </H3>
  ),
  p: ({ children }) => <P>{children}</P>,
  code: ({ children }) => <C>{children}</C>,
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-1.5 text-[15px] leading-7 text-muted-foreground [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground">{children}</ul>,
  hr: () => <hr className="mt-8 border-border" />,
  Code: ({ code, ...props }: React.ComponentProps<typeof Code> & { code: string }) => <Code {...props}>{code}</Code>,
};

type Frontmatter = { title: string; description: string; toc?: boolean };

/** Renders an MDX page (`page.mdx` with title/description frontmatter) inside the site shell. */
export function renderMdxPage({ default: Content, frontmatter }: { default: MDXContent; frontmatter: Frontmatter }, md: string, wrapper: React.ComponentType<{ children: React.ReactNode }> = React.Fragment) {
  const Wrapper = wrapper;
  createRoot(document.getElementById("root")!).render(
    <SiteShell page="examples">
      <DocsLayout toc={frontmatter.toc}>
        <PageHeader title={frontmatter.title} description={frontmatter.description} md={md} />
        <div className="mt-8 flex flex-col gap-4">
          <Wrapper>
            <Content components={components} />
          </Wrapper>
        </div>
      </DocsLayout>
    </SiteShell>,
  );
}
