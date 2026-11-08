import { config } from "@emoji-components/twemoji-font/package.json";
import { withoutFe0f } from "./dataset";

export type Renderer = "native" | "image";

declare const __DATA_VERSION__: string | undefined;

const DATA_CDN = "https://cdn.jsdelivr.net/npm/@emoji-components/data";

export type ShortcodeSet = "iamcal" | "cldr" | "cldr-native" | "emojibase" | "emojibase-native" | "emojibase-legacy" | "github" | "joypixels";

export const localeData = (locale: string, { shortcodes = "iamcal", baseUrl = `${DATA_CDN}@${typeof __DATA_VERSION__ === "string" ? __DATA_VERSION__ : "latest"}/data` }: { shortcodes?: ShortcodeSet; baseUrl?: string } = {}) =>
  `${baseUrl}/${locale}/${shortcodes}.json`;

export const DEFAULT_DATA_URL = localeData("en");

export const TWEMOJI_BASE_URL = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${config.twemoji}/assets/svg/`;
export const TWEMOJI_EMOJI_VERSION = 17;

export function twemojiUrl(unified: string, baseUrl = TWEMOJI_BASE_URL): string {
  return `${baseUrl}${unified.includes("200d") ? unified : withoutFe0f(unified)}.svg`;
}
