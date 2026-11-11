import pointerUrl from "./assets/pointer.png";

const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/";

export const DURATION = 6;

const CENTER = { x: 900, y: 315 };
const BASE = 200;
const TAPS = [0.7, 1.75, 2.8];
const SIZES = [1, 1.4, 1.85, 2.35];
const PRESS = 0.12;
const DEFLATE = [4, 5.1] as const;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const progress = (t: number, from: number, to: number) => clamp((t - from) / (to - from));
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const spring = (p: number) => 1 - Math.exp(-6 * p) * Math.cos(p * Math.PI * 3);

function face(t: number) {
  if (t >= DEFLATE[0]) {
    const p = progress(t, ...DEFLATE);
    return { scale: mix(SIZES[SIZES.length - 1]!, 1, easeInOut(p)), squash: 0, wobble: Math.sin(p * 40) * 7 * (1 - p) };
  }
  const i = TAPS.filter((tap) => t >= tap).length - 1;
  if (i < 0) return { scale: 1, squash: 0, wobble: 0 };
  const since = t - TAPS[i]!;
  const squash = since < PRESS ? Math.sin((since / PRESS) * Math.PI) * 0.12 : 0;
  const grow = spring(progress(t, TAPS[i]! + PRESS * 0.5, TAPS[i]! + 0.9));
  return { scale: mix(SIZES[i]!, SIZES[i + 1]!, grow), squash, wobble: 0 };
}

function pointer(t: number, scale: number) {
  const r = (BASE * scale) / 2;
  const rest = { x: CENTER.x + r * 0.62 + 46, y: CENTER.y + r * 0.62 + 46 };
  const touch = { x: CENTER.x + r * 0.5, y: CENTER.y + r * 0.5 };
  const tap = TAPS.find((at) => t >= at - 0.18 && t < at + PRESS + 0.12);
  const away = progress(t, DEFLATE[0] - 0.2, DEFLATE[0] + 0.3) * (1 - easeInOut(progress(t, DEFLATE[1] + 0.1, DURATION - 0.15)));
  if (tap === undefined) return { ...rest, pressed: false, away };
  const p = t < tap ? easeInOut(progress(t, tap - 0.18, tap)) : 1 - easeInOut(progress(t, tap + PRESS, tap + PRESS + 0.12));
  return { x: mix(rest.x, touch.x, p), y: mix(rest.y, touch.y, p), pressed: t >= tap && t < tap + PRESS, away };
}

const POINTER = { width: 165, height: 194, tip: { x: 50, y: 4 } };

function Pointer({ x, y, pressed, away }: { x: number; y: number; pressed: boolean; away: number }) {
  const k = 0.62;
  return (
    <img
      src={pointerUrl}
      alt=""
      width={POINTER.width * k}
      height={POINTER.height * k}
      className="absolute z-30 drop-shadow-[0_6px_10px_rgb(0_0_0/0.18)]"
      style={{
        left: x - POINTER.tip.x * k,
        top: y - POINTER.tip.y * k,
        opacity: 1 - away,
        transform: `translate(${away * 120}px, ${away * 120}px) scale(${pressed ? 0.92 : 1})`,
        transformOrigin: `${(POINTER.tip.x / POINTER.width) * 100}% ${(POINTER.tip.y / POINTER.height) * 100}%`,
      }}
    />
  );
}

function OgTitle() {
  return (
    <div className="relative z-10 flex w-[600px] flex-col gap-6 pl-20">
      <h1 className="text-[84px] leading-[1.02] font-semibold tracking-[-0.035em]">Emoji Components</h1>
      <p className="text-[32px] leading-[1.3] tracking-[-0.01em] text-neutral-500">Unstyled, composable emoji picker for React.</p>
    </div>
  );
}

export function OgVideo({ t }: { t: number }) {
  const { scale, squash, wobble } = face(t);
  const size = BASE * scale;
  return (
    <div data-og="" className="relative flex h-[630px] w-[1200px] items-center overflow-hidden bg-white text-neutral-950" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <OgTitle />
      <img
        src={`${TWEMOJI_BASE_URL}1faea.svg`}
        alt=""
        className="absolute z-20 drop-shadow-[0_20px_40px_rgb(0_0_0/0.12)]"
        style={{ left: CENTER.x - size / 2, top: CENTER.y - size / 2, width: size, height: size, transform: `rotate(${wobble}deg) scale(${1 + squash}, ${1 - squash})` }}
      />
      <Pointer {...pointer(t, scale)} />
    </div>
  );
}
