declare module "*.mdx" {
  export const frontmatter: { title: string; description: string; toc?: boolean };
}
