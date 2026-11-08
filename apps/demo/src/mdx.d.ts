declare module "*.mdx" {
  export const frontmatter: { title: string; description: string; toc?: boolean };
}

declare module "virtual:api-reference" {
  const tables: Record<string, string[][]>;
  export = tables;
}
