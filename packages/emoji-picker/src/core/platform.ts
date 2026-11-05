export type Renderer = "native" | "twemoji";

export const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/";
export const TWEMOJI_EMOJI_VERSION = 17;

export function twemojiUrl(unified: string, baseUrl = TWEMOJI_BASE_URL): string {
  const code = unified.includes("200d")
    ? unified
    : unified
        .split("-")
        .filter((c) => c !== "fe0f")
        .join("-");
  return `${baseUrl}${code}.svg`;
}

let cached: boolean | undefined;

export function needsTwemoji(): boolean {
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return false;
  try {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) return (cached = false);
    ctx.font = "16px sans-serif";
    // A supported flag is one glyph; without flag support it falls back to two indicator letters side by side
    const flag = ctx.measureText("\u{1F1FA}\u{1F1F8}").width;
    const letters = ctx.measureText("\u{1F1FA}").width * 2;
    cached = flag >= letters * 0.9;
  } catch {
    cached = false;
  }
  return cached;
}
