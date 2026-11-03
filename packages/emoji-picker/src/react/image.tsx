// Internal: every image emoji the library draws (custom emoji, Twemoji), in the
// grids, search results, the horizontal list and <Emoji>.
import * as React from "react";
import * as Epr from "emoji-picker-react/primitives";
import { unifiedToNative, type EmojiRecord } from "../core/dataset";
import { useEmojiContext } from "./provider";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the user asked for reduced motion; follows changes. */
export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    () => typeof matchMedia === "function" && matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Intrinsic size when none is known: square, at a common pack resolution. */
const DEFAULT_SIZE = 64;

export type EmojiImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> & {
  src: string;
  /** Accessible name (the emoji's name). */
  alt: string;
  /** The record, for a custom emoji's still frame and intrinsic size. */
  record?: EmojiRecord;
  /** Display size, any CSS length. */
  size: string | number;
  /** Play an animated emoji. Ignored with reduced motion, or without a still frame (nothing to swap to). */
  animate: boolean;
  /** Text drawn if the image fails to load (the native emoji for Twemoji); else an empty box of the same size. */
  fallback?: string;
};

/**
 * Lazy (`loading="lazy"`, `decoding="async"`), sized up front (no layout shift),
 * never dragged, fitted inside a square of `size`, and still unless `animate`.
 */
export function EmojiImage({ src, alt, record, size, animate, fallback, style, ...props }: EmojiImageProps) {
  const reduce = usePrefersReducedMotion();
  // A missing asset (a 404 for an emoji newer than the Twemoji set) never shows a broken image.
  const [failed, setFailed] = React.useState<string | null>(null);
  const still = record?.animated && record.stillUrl && (!animate || reduce) ? record.stillUrl : undefined;
  const width = record?.width ?? DEFAULT_SIZE;
  const height = record?.height ?? record?.width ?? DEFAULT_SIZE;
  const shown = still ?? src;
  if (failed === shown) {
    const box: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, ...style };
    return (
      <span className={props.className} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} data-emoji-fallback="" style={fallback ? { ...box, fontSize: size, lineHeight: 1 } : box}>
        {fallback}
      </span>
    );
  }
  return (
    <img
      {...props}
      src={shown}
      onError={(e) => {
        setFailed(shown);
        props.onError?.(e);
      }}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      style={{ width: size, height: size, objectFit: "contain", ...style }}
    />
  );
}

/**
 * An image emoji in one of the engine's cells (custom, or Twemoji), drawn like our
 * own grids draw it: lazy, sized up front, an animated one still until active.
 */
export function EngineCellImage({ unified, src, active }: { unified: string; src: string; active: boolean }) {
  const { store } = useEmojiContext();
  const record = store.get(unified);
  const props = { src: record?.imageUrl ?? src, alt: record?.name ?? unified, record, size: "var(--emoji-image-size, var(--emoji-size, 30px))", fallback: record?.imageUrl ? undefined : unifiedToNative(unified) };
  // Only animated cells follow the hovered emoji, so hovering re-renders a few cells, not every image.
  if (record?.animated && record.stillUrl) return <AnimatedCellImage {...props} unified={unified} highlighted={active} />;
  return <EmojiImage {...props} animate={active} />;
}

function AnimatedCellImage({ unified, highlighted, ...props }: Omit<EmojiImageProps, "animate"> & { unified: string; highlighted: boolean }) {
  // The engine's hovered (or focused) emoji; its cells' own isActive doesn't follow hover.
  const hovered = Epr.useActiveEmoji()?.unified === unified;
  return <EmojiImage {...props} animate={hovered || highlighted} />;
}
