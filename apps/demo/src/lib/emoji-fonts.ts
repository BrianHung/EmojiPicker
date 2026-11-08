export type EmojiFont = "twemoji" | "noto";

const FAMILY: Record<EmojiFont, string> = { twemoji: "Twemoji", noto: "Noto Color Emoji" };
const NOTO = "https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap";

const stylesheet = (href: string) =>
  new Promise((done) => {
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", crossOrigin: "anonymous", href });
    link.onload = link.onerror = done;
    document.head.append(link);
  });

async function twemoji() {
  await import("@emoji-components/twemoji-font/twemoji.css");
  const link = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].find((l) => l.href.includes("twemoji") && !l.sheet);
  if (link) await new Promise((done) => (link.onload = link.onerror = done));
}

// Emoji fonts carry empty glyphs for the digits, # and * that keycaps need, so text stacks get a copy of their faces without Latin-1
const withoutLatin1 = (range: string) => {
  const [lo, hi = lo] = range
    .trim()
    .replace(/^u\+/i, "")
    .split("-")
    .map((n) => parseInt(n, 16));
  if (hi! <= 0xff) return [];
  return lo! <= 0xff ? [`U+100-${hi!.toString(16)}`] : [range.trim()];
};

function copyForText(family: string) {
  const css: string[] = [];
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSFontFaceRule) || rule.style.getPropertyValue("font-family").replace(/["']/g, "") !== family) continue;
      const range = rule.style.getPropertyValue("unicode-range").split(",").flatMap(withoutLatin1);
      const src = rule.style.getPropertyValue("src").replace(/url\(["']?([^"')]+)["']?\)/g, (_, url: string) => `url("${new URL(url, sheet.href ?? location.href)}")`);
      if (range.length) css.push(`@font-face { font-family: "${family} Text"; font-display: swap; src: ${src}; unicode-range: ${range.join(", ")}; }`);
    }
  }
  document.head.append(Object.assign(document.createElement("style"), { textContent: css.join("\n") }));
}

const loading: Partial<Record<EmojiFont, Promise<void>>> = {};

export const loadEmojiFont = (font: EmojiFont) => (loading[font] ??= (font === "twemoji" ? twemoji() : stylesheet(NOTO)).then(() => copyForText(FAMILY[font])));
