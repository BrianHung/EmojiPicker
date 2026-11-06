import { readFileSync } from "node:fs";
import type { HtmlTagDescriptor, Plugin } from "vite";
import { EXAMPLES } from "../src/lib/examples";

export const SITE = "https://emoji.brianhung.me";
const NAME = "Emoji Picker";
const TAGLINE = "A virtualized, unstyled, and composable emoji picker for React.";
const PACKAGE = "@brianhung/emoji-picker-react";

type Page = { entry: string; heading: string; description: string; title?: string };

const EXAMPLE_IDS = EXAMPLES.map((e) => e.id);

function frontmatter(path: string): Record<string, string> {
  const yaml = readFileSync(new URL(`../${path}`, import.meta.url), "utf8").match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
  return Object.fromEntries(yaml.split("\n").map((line) => line.split(/:\s*(.*)/s).slice(0, 2)));
}

function example(name: string): Page {
  const { title = name, description = "" } = frontmatter(`src/pages/examples/${name}/page.mdx`);
  return { entry: `examples/${name}/index.html`, heading: title, description };
}

export const PAGES = {
  main: { entry: "index.html", heading: NAME, title: `${NAME} · Virtualized, unstyled React emoji picker`, description: TAGLINE },
  gallery: {
    entry: "gallery/index.html",
    heading: "Gallery",
    description: "React emoji pickers, tapbacks, and shortcode autocomplete styled like Apple, Slack, Discord, Notion, Linear, and Instagram.",
  },
  examples: {
    entry: "examples/index.html",
    heading: "Examples",
    description: "React emoji picker integrations to copy into your app: Tiptap, Lexical, semantic search, custom emoji, and custom virtualizers.",
  },
  ...Object.fromEntries(EXAMPLE_IDS.map((name) => [name, example(name)])),
} satisfies Record<string, Page>;

export const entries = Object.fromEntries(Object.entries(PAGES).map(([name, page]) => [name, page.entry]));

export const pageUrl = ({ entry }: Page) => `${SITE}/${entry.replace(/index\.html$/, "")}`;

const pageTitle = (page: Page) => page.title ?? `${page.heading} · ${NAME}`;

const nav = Object.values(PAGES)
  .map((page) => `<li><a href="${pageUrl(page)}">${page.heading}</a></li>`)
  .join("");

const meta = (key: "name" | "property", values: Record<string, string | number>) => Object.entries(values).map(([k, content]): HtmlTagDescriptor => ({ tag: "meta", attrs: { [key]: k, content: String(content) } }));

const jsonLd = (page: Page) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: NAME,
  alternateName: PACKAGE,
  description: page.description,
  url: pageUrl(page),
  codeRepository: "https://github.com/BrianHung/EmojiPicker",
  programmingLanguage: "TypeScript",
  runtimePlatform: "React",
  license: "https://opensource.org/licenses/MIT",
  sameAs: `https://www.npmjs.com/package/${PACKAGE}`,
  author: { "@type": "Person", name: "Brian Hung", url: "https://www.brianhung.me/" },
});

function head(page: Page): HtmlTagDescriptor[] {
  const url = pageUrl(page);
  const title = pageTitle(page);
  const media = { width: 1200, height: 630 };
  return [
    { tag: "title", children: title },
    ...meta("name", { description: page.description }),
    { tag: "link", attrs: { rel: "canonical", href: url } },
    { tag: "link", attrs: { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" } },
    { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" } },
    { tag: "link", attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" } },
    { tag: "meta", attrs: { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#ffffff" } },
    { tag: "meta", attrs: { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#0a0a0a" } },
    ...meta("property", {
      "og:type": "website",
      "og:site_name": NAME,
      "og:title": title,
      "og:description": page.description,
      "og:url": url,
      "og:image": `${SITE}/og.png`,
      "og:image:width": media.width,
      "og:image:height": media.height,
      "og:video": `${SITE}/og.mp4`,
      "og:video:type": "video/mp4",
      "og:video:width": media.width,
      "og:video:height": media.height,
    }),
    ...meta("name", { "twitter:card": "summary_large_image", "twitter:title": title, "twitter:description": page.description, "twitter:image": `${SITE}/og.png` }),
    ...(page === PAGES.main ? [{ tag: "script", attrs: { type: "application/ld+json" }, children: JSON.stringify(jsonLd(page)) }] : []),
    { tag: "noscript", injectTo: "body-prepend", children: `<h1>${page.heading}</h1><p>${page.description}</p><ul>${nav}</ul>` },
  ];
}

export function site(): Plugin {
  let root = "";
  return {
    name: "site",
    configResolved(config) {
      root = config.root;
    },
    // The Cloudflare plugin hands dev HTML over by absolute path, the build by URL path.
    transformIndexHtml(html, { path }) {
      const entry = (path.startsWith(root) ? path.slice(root.length) : path).replace(/^\//, "");
      const page = Object.values(PAGES).find((p) => p.entry === entry);
      return page ? { html, tags: head(page).map((tag) => ({ injectTo: "head", ...tag })) } : html;
    },
  };
}
