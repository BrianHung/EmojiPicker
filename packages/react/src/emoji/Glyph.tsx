"use client";

import * as React from "react";
import { type EmojiRecord, unifiedToNative } from "@emoji-components/core";
import * as EmojiPickerRootCssVars from "../picker/root/EmojiPickerRootCssVars";
import * as EmojiCssVars from "./EmojiCssVars";
import { EmojiImage } from "./EmojiImage";
import { useEmojiContext } from "../provider/EmojiProviderContext";

const SIZE = `var(${EmojiPickerRootCssVars.emojiImageSize}, var(--ep-size))`;

// Browsers draw a glyph on a whole px row, so the top pad puts the baseline (ascent 87.75%, tokens.css) on the row nearest the centred one
const TOP = "calc(round(var(--ep-glyph-pad) + 0.8775em, 1px) - round(0.8775em, 1px))";

const TEXT: React.CSSProperties = {
  position: "relative",
  display: "block",
  alignSelf: "center",
  justifySelf: "center",
  padding: `${TOP} var(--ep-glyph-pad) calc(2 * var(--ep-glyph-pad) - ${TOP})`,
  fontFamily: `var(${EmojiCssVars.fontFamily})`,
  fontSize: "var(--ep-size)",
  lineHeight: "100%",
  textAlign: "center",
  letterSpacing: 0,
};
const IMAGE: React.CSSProperties = { boxSizing: "content-box", minWidth: 0, maxWidth: "none", minHeight: 0, maxHeight: "none", padding: 0, margin: "auto", alignSelf: "center", justifySelf: "center" };

export const Glyph = React.memo(function Glyph({ unified, record, animate = false }: { unified: string; record: EmojiRecord | undefined; animate?: boolean }) {
  const { image } = useEmojiContext();
  const src = record?.imageUrl ?? image(unified);
  if (src) return <EmojiImage src={src} alt={record?.name ?? unified} record={record} size={SIZE} animate={animate} fallback={record?.imageUrl ? undefined : unifiedToNative(unified)} style={IMAGE} />;
  return (
    <span data-glyph="" style={TEXT}>
      {unifiedToNative(unified)}
    </span>
  );
});

export function useOverridden(unified: string, record: EmojiRecord | undefined) {
  const { renderer, image } = useEmojiContext();
  return renderer === "native" && !record?.imageUrl && image(unified) !== undefined;
}
