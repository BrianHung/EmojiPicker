import type { HtmlTagDescriptor, Plugin } from "vite";

export const SITE = "https://emoji.brianhung.me";
const NAME = "Emoji Picker";
const TAGLINE = "A virtualized, unstyled, and composable emoji picker for React.";
const PACKAGE = "@brianhung/emoji-picker-react";

type Page = { entry: string; heading: string; description: string; title?: string };

export const PAGES = {
  main: { entry: "index.html", heading: NAME, title: `${NAME} · Virtualized, unstyled React emoji picker`, description: TAGLINE },
  gallery: {
    entry: "gallery/index.html",
    heading: "Gallery",
    description: "The virtualized, unstyled, composable React emoji picker styled like Apple, Slack, Discord, Notion, Linear and Instagram: pickers, tapbacks and autocomplete.",
  },
  examples: {
    entry: "examples/index.html",
    heading: "Examples",
    description: "Integrations of the virtualized, unstyled, composable React emoji picker to copy into your app: Tiptap, Lexical, semantic search, custom emoji and virtualizers.",
  },
  tiptap: {
    entry: "examples/tiptap/index.html",
    heading: "Tiptap",
    description: "Shortcode suggestions and a virtualized, unstyled emoji picker for the Tiptap editor, composed from React parts.",
  },
  lexical: {
    entry: "examples/lexical/index.html",
    heading: "Lexical",
    description: "Shortcode autocomplete and a composable, unstyled React emoji picker for the Lexical editor.",
  },
  "semantic-search": {
    entry: "examples/semantic-search/index.html",
    heading: "Semantic search",
    description: "Emoji search by meaning in a virtualized React emoji picker: on-device embeddings, a vector DB, or a decision model through the search prop.",
  },
  "custom-emoji": {
    entry: "examples/custom-emoji/index.html",
    heading: "Custom emoji",
    description: "Custom image emoji from a hosted pack.json in a virtualized, composable React emoji picker, searchable by name and shortcode.",
  },
  virtualizer: {
    entry: "examples/virtualizer/index.html",
    heading: "Bring your own virtualizer",
    description: "The composable React emoji picker's grid on TanStack Virtual, react-window, Virtuoso, or the virtual list you already ship.",
  },
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
