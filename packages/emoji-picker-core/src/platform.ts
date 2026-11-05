import { withoutFe0f } from "./dataset";

export type Renderer = "native" | "twemoji" | "image";

declare const __CORE_VERSION__: string | undefined;

export const DEFAULT_DATA_URL = `https://cdn.jsdelivr.net/npm/@brianhung/emoji-picker-core@${typeof __CORE_VERSION__ === "string" ? __CORE_VERSION__ : "latest"}/data/en.json`;

export const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/";
export const TWEMOJI_EMOJI_VERSION = 17;

export function twemojiUrl(unified: string, baseUrl = TWEMOJI_BASE_URL): string {
  return `${baseUrl}${unified.includes("200d") ? unified : withoutFe0f(unified)}.svg`;
}
