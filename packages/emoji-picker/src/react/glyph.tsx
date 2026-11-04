import * as React from "react";
import { isUnified, unifiedToNative, type EmojiRecord } from "../core/dataset";
import { EmojiImage } from "./image";
import { ArtworkGlyph, findArtwork, useArtworkMap } from "./overrides";
import { useEmojiContext } from "./provider";

const SIZE = "var(--emoji-image-size, var(--ep-size))";

/** What a cell or reaction button draws: artwork, an image (custom, Twemoji) or the native glyph. */
export function Glyph({ unified, record, animate = false }: { unified: string; record: EmojiRecord | undefined; animate?: boolean }) {
  const { renderer, imageUrl } = useEmojiContext();
  const artwork = useArtworkMap();
  const art = artwork ? findArtwork(artwork, unified) : undefined;
  const alt = record?.name ?? unified;
  if (art !== undefined) return <ArtworkGlyph art={art} alt={alt} size={SIZE} />;
  const src = record?.imageUrl ?? (renderer === "twemoji" && isUnified(unified) ? imageUrl(unified) : undefined);
  if (src) return <EmojiImage src={src} alt={alt} record={record} size={SIZE} animate={animate} fallback={record?.imageUrl ? undefined : unifiedToNative(unified)} />;
  return <span data-glyph="">{unifiedToNative(unified)}</span>;
}
