// Internal: every image emoji the library draws (custom emoji, Twemoji), in the
// grids, search results, the horizontal list and <Emoji>.
import * as React from "react";
import type { EmojiRecord } from "../core/dataset";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the user asked for reduced motion; follows changes. */
function usePrefersReducedMotion(): boolean {
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
