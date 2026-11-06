// Adapted from emoji-picker-react (MIT, see THIRD_PARTY_NOTICES.md)
import { unifiedToNative, withoutFe0f, withoutTone, type EmojiRecord } from "./dataset";
import { createStore } from "./reactive";

const DEFAULT_EMOJI_FONT = '"Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", "Apple Color Emoji", "Twemoji Mozilla", "Noto Color Emoji", "EmojiOne Color", "Android Emoji"';

const KNOWN_FAILING = /* @__PURE__ */ new Set(["2640", "2642", "2695"]);

const CELL = 32;
export const PROBE_BATCH = 16;
const FLAG_SAMPLE = "1f1fa-1f1f8";

const isCountryFlag = (unified: string) => /^(1f1[ef][\da-f]-1f1[ef][\da-f]$|1f3f4-e00)/i.test(unified);

export interface NativeProbe {
  prime(unifieds: Iterable<string>): void;
  // true or false once drawn, null when it can't be told, undefined before
  result(unified: string): boolean | null | undefined;
  probed(): Iterable<string>;
}

export interface NativeSupport {
  probe: NativeProbe;
  failedVersions: ReadonlySet<number>;
  countryFlags: boolean;
}

function createProbe(ctx: CanvasRenderingContext2D, baseline: number): NativeProbe {
  const results = new Map<string, boolean | null>();
  const font = ctx.font;
  const draw = (text: string, y: number, ink: string) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, CELL, CELL);
    ctx.clip();
    ctx.fillStyle = ink;
    ctx.fillText(text, 0, y);
    ctx.restore();
  };
  const run = (candidates: [string, string, string][]) => {
    try {
      const height = candidates.length * CELL;
      ctx.canvas.width = CELL;
      ctx.canvas.height = 2 * height;
      ctx.font = font;
      ctx.textBaseline = "top";
      candidates.forEach(([, text, comparison], i) => {
        draw(text, i * CELL, "#000");
        draw(comparison, i * CELL + height, text === comparison ? "#f00" : "#000");
      });
      const pixels = ctx.getImageData(0, 0, CELL, 2 * height).data;
      const words = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.length / 4);
      candidates.forEach(([unified, text, comparison], i) => {
        const start = i * CELL * CELL;
        let alpha = 0;
        let difference = 0;
        for (let p = start; p < start + CELL * CELL; p++) {
          alpha |= pixels[4 * p + 3]!;
          difference |= words[p]! ^ words[p + CELL * height]!;
        }
        results.set(unified, alpha !== 0 && (text === comparison ? difference === 0 : difference !== 0));
      });
    } catch {
      for (const [unified] of candidates) results.set(unified, null);
    }
  };
  return {
    prime(unifieds) {
      const candidates: [string, string, string][] = [];
      for (const unified of unifieds) {
        if (results.has(unified)) continue;
        results.set(unified, null);
        const text = unifiedToNative(unified);
        if (!text) continue;
        try {
          const width = ctx.measureText(text).width;
          if (width <= 0 || width >= 1.5 * baseline) results.set(unified, false);
          else candidates.push([unified, text, text.replace(/[\u{e0020}-\u{e007f}]/gu, "")]);
        } catch {}
      }
      for (let i = 0; i < candidates.length; i += PROBE_BATCH) run(candidates.slice(i, i + PROBE_BATCH));
    },
    result: (unified) => results.get(unified),
    probed: () => [...results.keys()],
  };
}

const probes = new Map<string, NativeProbe | null>();
const colorless = new Set<string>();

function probeFor(fontFamily: string): NativeProbe | null {
  try {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx || /jsdom/i.test(navigator.userAgent)) return null;
    ctx.font = `24px ${fontFamily}`;
    ctx.textBaseline = "top";
    const baseline = ctx.measureText("😀").width;
    const candidate = createProbe(ctx, baseline);
    candidate.prime(["1f600"]);
    const color = Boolean(baseline) && candidate.result("1f600") === true;
    if (color) colorless.delete(fontFamily);
    else colorless.add(fontFamily);
    return color ? candidate : null;
  } catch {
    return null;
  }
}

export function nativeProbe(fontFamily = DEFAULT_EMOJI_FONT): NativeProbe | null {
  if (typeof document === "undefined") return null;
  if (!probes.has(fontFamily)) probes.set(fontFamily, probeFor(fontFamily));
  return probes.get(fontFamily)!;
}

const sameVerdicts = (before: NativeProbe | null, after: NativeProbe | null) => {
  if (!before || !after) return before === after;
  after.prime(before.probed());
  return [...before.probed()].every((unified) => before.result(unified) === after.result(unified));
};

const verdicts = /* @__PURE__ */ createStore(0, (generation: number) => generation + 1);
let watching = false;
function recheck() {
  let changed = false;
  for (const [font, before] of probes) {
    const after = probeFor(font);
    if (!sameVerdicts(before, after)) changed = Boolean(probes.set(font, after));
  }
  if (changed) verdicts.dispatch(undefined);
}

// Emoji web fonts can finish loading after the first probe
export function onNativeSupportChange(listener: () => void): () => void {
  if (!watching && typeof document !== "undefined" && document.fonts?.addEventListener) {
    watching = true;
    document.fonts.addEventListener("loadingdone", recheck);
  }
  return verdicts.subscribe(listener);
}

export function nativeSupport(probe: NativeProbe, samples: ReadonlyMap<number, string>): NativeSupport {
  probe.prime([FLAG_SAMPLE, ...samples.values()]);
  const failedVersions = new Set<number>();
  for (const [version, unified] of samples) if (probe.result(unified) === false) failedVersions.add(version);
  return { probe, failedVersions, countryFlags: probe.result(FLAG_SAMPLE) !== false };
}

export function isNativeSupported(support: NativeSupport | null, unified: string, version: number): boolean {
  const exact = support?.probe.result(unified);
  if (typeof exact === "boolean") return exact;
  return !support || !(support.failedVersions.has(version) || (!support.countryFlags && isCountryFlag(unified)));
}

export const drawsNatively = (support: NativeSupport | null, record: EmojiRecord, unified: string): boolean => !KNOWN_FAILING.has(withoutFe0f(withoutTone(record.unified))) && isNativeSupported(support, unified, record.version);

export function needsImageFallback(): boolean {
  const probe = nativeProbe();
  return probe ? !nativeSupport(probe, new Map()).countryFlags : colorless.has(DEFAULT_EMOJI_FONT);
}
