import { config } from "@emoji-components/twemoji-font/package.json";
import { withoutFe0f } from "./dataset";

export type Renderer = "native" | "image";

declare const __DATA_VERSION__: string | undefined;

const DATA_CDN = "https://cdn.jsdelivr.net/npm/@emoji-components/data";

export type ShortcodeSet = "iamcal" | "cldr" | "cldr-native" | "emojibase" | "emojibase-native" | "emojibase-legacy" | "github" | "joypixels";

// The folders of @emoji-components/data
export const DATA_LOCALES = ["bn", "da", "de", "en", "en-gb", "es", "es-mx", "et", "fi", "fr", "hi", "hu", "it", "ja", "ko", "lt", "ms", "nb", "nl", "pl", "pt", "ru", "sv", "th", "uk", "vi", "zh", "zh-hant"] as const;

const ALIASES: Record<string, string> = { "es-419": "es-mx", no: "nb", nn: "nb" };

export function dataLocale(locale: string): string {
  let tag: Intl.Locale;
  try {
    tag = new Intl.Locale(locale);
  } catch {
    return "en";
  }
  const known = (code: string) => (DATA_LOCALES as readonly string[]).includes(code);
  const full = tag.toString().toLowerCase();
  if (known(full)) return full;
  const alias = ALIASES[`${tag.language}-${tag.region?.toLowerCase()}`] ?? ALIASES[tag.language];
  if (alias) return alias;
  if (tag.language === "zh") return tag.maximize().script === "Hant" ? "zh-hant" : "zh";
  return known(tag.language) ? tag.language : "en";
}

export const localeData = (locale: string, { shortcodes = "iamcal", baseUrl = `${DATA_CDN}@${typeof __DATA_VERSION__ === "string" ? __DATA_VERSION__ : "latest"}/data` }: { shortcodes?: ShortcodeSet; baseUrl?: string } = {}) =>
  `${baseUrl}/${dataLocale(locale)}/${shortcodes}.json`;

export const TWEMOJI_BASE_URL = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${config.twemoji}/assets/svg/`;
export const TWEMOJI_EMOJI_VERSION = 17;

export function twemojiUrl(unified: string, baseUrl = TWEMOJI_BASE_URL): string {
  return `${baseUrl}${unified.includes("200d") ? unified : withoutFe0f(unified)}.svg`;
}
