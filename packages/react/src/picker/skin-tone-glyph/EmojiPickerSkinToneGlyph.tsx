"use client";

import * as React from "react";

import { nativeToUnified, withTone } from "@brianhung/emoji-picker-core";
import { Emoji, type EmojiProps } from "../../emoji/Emoji";
import { EmojiPickerSkinToneOptionContext, useEmojiPickerSkinToneContext } from "../skin-tone/EmojiPickerSkinToneContext";

export type EmojiPickerSkinToneGlyphProps = Omit<EmojiProps, "emoji"> & {
  emoji?: string;
};

export function EmojiPickerSkinToneGlyph({ emoji = "✋", ...props }: EmojiPickerSkinToneGlyphProps) {
  const { tone: current } = useEmojiPickerSkinToneContext("Glyph");
  const tone = React.useContext(EmojiPickerSkinToneOptionContext) ?? current;
  const unified = nativeToUnified(emoji);
  return <Emoji {...props} emoji={tone > 0 ? withTone(unified, tone) : unified} />;
}

export declare namespace EmojiPickerSkinToneGlyph {
  type Props = EmojiPickerSkinToneGlyphProps;
}
