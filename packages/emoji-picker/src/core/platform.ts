export type Renderer = "native" | "twemoji";

/** jdecked/twemoji, the maintained Twemoji fork. Pin the version; self-host with `twemojiBaseUrl`. */
export const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/";
/**
 * Newest Unicode emoji version the pinned set (17.0.3) draws. With Twemoji, newer
 * emoji are left out of pickers; set the provider's `twemojiVersion` when you
 * self-host another set.
 */
export const TWEMOJI_EMOJI_VERSION = 17;

/**
 * Twemoji's file naming: FE0F is dropped unless the sequence has a ZWJ.
 * 2764-fe0f → 2764.svg, 1f3f3-fe0f-200d-1f308 → 1f3f3-fe0f-200d-1f308.svg
 */
export function twemojiUrl(unified: string, baseUrl = TWEMOJI_BASE_URL): string {
  const code = unified.includes("200d") ? unified : unified.split("-").filter((c) => c !== "fe0f").join("-");
  return `${baseUrl}${code}.svg`;
}

let cached: boolean | undefined;

/**
 * True when the system emoji font can't draw a flag (Windows ships none),
 * which is where Twemoji gives a consistent look. Feature check, not UA sniffing.
 * Returns false on the server and when canvas is unavailable.
 */
export function needsTwemoji(): boolean {
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return false;
  try {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) return (cached = false);
    ctx.font = "16px sans-serif";
    // A supported flag is one glyph (about one indicator wide); without flag
    // support it falls back to two indicator letters side by side.
    const flag = ctx.measureText("\u{1F1FA}\u{1F1F8}").width;
    const letters = ctx.measureText("\u{1F1FA}").width * 2;
    cached = flag >= letters * 0.9;
  } catch {
    cached = false;
  }
  return cached;
}
