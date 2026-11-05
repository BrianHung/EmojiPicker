import { withoutFe0f } from "./dataset";

export type Renderer = "native" | "twemoji" | "image";

declare const __CORE_VERSION__: string | undefined;
declare const __DATA_VERSION__: string | undefined;

const JSDELIVR = "https://cdn.jsdelivr.net/npm/@brianhung/emoji-picker-";

export const DEFAULT_DATA_URL = `${JSDELIVR}core@${typeof __CORE_VERSION__ === "string" ? __CORE_VERSION__ : "latest"}/data/en.json`;

export type ShortcodeSet = "iamcal" | "cldr" | "cldr-native" | "emojibase" | "emojibase-native" | "emojibase-legacy" | "github" | "joypixels";

export const localeData = (locale: string, { shortcodes = "iamcal", baseUrl = `${JSDELIVR}data@${typeof __DATA_VERSION__ === "string" ? __DATA_VERSION__ : "latest"}/data` }: { shortcodes?: ShortcodeSet; baseUrl?: string } = {}) =>
  `${baseUrl}/${locale}/${shortcodes}.json`;

export const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/";
export const TWEMOJI_EMOJI_VERSION = 17;

export function twemojiUrl(unified: string, baseUrl = TWEMOJI_BASE_URL): string {
  return `${baseUrl}${unified.includes("200d") ? unified : withoutFe0f(unified)}.svg`;
}
