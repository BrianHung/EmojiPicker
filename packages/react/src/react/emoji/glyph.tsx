import * as React from "react";
import { type EmojiRecord, unifiedToNative } from "@brianhung/emoji-picker-core";
import { EmojiImage } from "./image";
import { useEmojiContext } from "../provider/provider";

const SIZE = "var(--emoji-image-size, var(--ep-size))";

const TEXT: React.CSSProperties = {
  position: "relative",
  display: "block",
  alignSelf: "center",
  justifySelf: "center",
  padding: "var(--ep-glyph-pad)",
  fontFamily: "var(--emoji-font-family)",
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
