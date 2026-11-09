declare module "*.mdx" {
  export const frontmatter: { title: string; description: string; toc?: boolean };
}

declare module "virtual:api-reference" {
  const parts: Record<string, { attributes: string[][]; variables: string[][] }>;
  export default parts;
}
