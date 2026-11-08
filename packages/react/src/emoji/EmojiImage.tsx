"use client";

import * as React from "react";
import type { EmojiRecord } from "@brianhung/emoji-picker-core";
import { useStore } from "../utils/useStore";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const reducedMotion = { subscribe: subscribeReducedMotion, getSnapshot: () => typeof matchMedia === "function" && matchMedia(REDUCED_MOTION).matches, getServerSnapshot: () => false };

const usePrefersReducedMotion = (): boolean => useStore(reducedMotion);

const DEFAULT_SIZE = 64;

// contain: layout drops the text baseline so the box sits on the line like an <img>; start-aligned because Apple Color Emoji pads its advance on the trailing side below 24px
export const NATIVE: React.CSSProperties = { display: "inline-flex", alignItems: "center", lineHeight: 1, whiteSpace: "nowrap", contain: "layout", fontFamily: "var(--emoji-font-family)" };

type EmojiImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> & {
  src: string;
  alt: string;
  record?: EmojiRecord;
  size: string | number;
  animate: boolean;
  fallback?: string;
  "data-slot"?: string;
};

export const EmojiImage = React.forwardRef<HTMLElement, EmojiImageProps>(function EmojiImage({ src, alt, record, size, animate, fallback, style, "data-slot": slot, ...props }, ref) {
  const reduce = usePrefersReducedMotion();
  const [failed, setFailed] = React.useState<string | null>(null);
  const still = record?.animated && record.stillUrl && (!animate || reduce) ? record.stillUrl : undefined;
  const width = record?.width ?? DEFAULT_SIZE;
  const height = record?.height ?? record?.width ?? DEFAULT_SIZE;
  const shown = still ?? src;
  if (failed === shown) {
    return (
      <span
        ref={ref}
        className={props.className}
        data-slot={slot}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        data-emoji-fallback=""
        style={{ ...NATIVE, width: size, height: size, fontSize: size, ...style }}
      >
        {fallback}
      </span>
    );
  }
  return (
    <img
      {...props}
      data-slot={slot}
      ref={ref as React.Ref<HTMLImageElement>}
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
});
