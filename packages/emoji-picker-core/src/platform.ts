import { withoutFe0f } from "./dataset";

export type Renderer = "native" | "twemoji" | "image";

export const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/";
export const TWEMOJI_EMOJI_VERSION = 17;

export function twemojiUrl(unified: string, baseUrl = TWEMOJI_BASE_URL): string {
  return `${baseUrl}${unified.includes("200d") ? unified : withoutFe0f(unified)}.svg`;
}
