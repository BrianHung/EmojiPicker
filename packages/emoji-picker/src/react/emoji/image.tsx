import * as React from "react";
import type { EmojiRecord } from "../../core/dataset";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    () => typeof matchMedia === "function" && matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

const DEFAULT_SIZE = 64;

type EmojiImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> & {
  src: string;
  alt: string;
  record?: EmojiRecord;
  size: string | number;
  animate: boolean;
  fallback?: string;
};

export function EmojiImage({ src, alt, record, size, animate, fallback, style, ...props }: EmojiImageProps) {
  const reduce = usePrefersReducedMotion();
  // Emoji newer than the Twemoji set 404: show the fallback, never a broken image
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
