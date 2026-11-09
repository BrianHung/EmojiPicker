import type * as React from "react";
import * as EmojiPickerSkinToneCssVars from "../EmojiPickerSkinToneCssVars";

const SWATCHES = ["#ffd225", "#ffdfbd", "#e9c197", "#c88e62", "#a86637", "#60463a"];
export const swatch = (tone: number): React.CSSProperties => ({
  width: `var(${EmojiPickerSkinToneCssVars.skinToneSize}, 15px)`,
  height: `var(${EmojiPickerSkinToneCssVars.skinToneSize}, 15px)`,
  borderRadius: "50%",
  background: SWATCHES[tone],
});
