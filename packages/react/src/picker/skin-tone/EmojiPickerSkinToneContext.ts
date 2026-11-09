"use client";

import * as React from "react";
import type { SkinToneValue } from "@emoji-components/core";
import type { EmojiPickerOrientation } from "../utils/types";

export type EmojiPickerSkinToneContext = {
  tone: SkinToneValue;
  open: boolean;
  orientation: EmojiPickerOrientation;
  toggle(event?: Event): void;
  choose(tone: SkinToneValue, event?: Event): void;
  label(tone: SkinToneValue): string;
  group: string;
  optionsId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  optionsRef: React.RefObject<HTMLDivElement | null>;
};
export const EmojiPickerSkinToneContext = React.createContext<EmojiPickerSkinToneContext | null>(null);
export const EmojiPickerSkinToneOptionContext = React.createContext<SkinToneValue | null>(null);

export function useEmojiPickerSkinToneContext(part: string) {
  const value = React.useContext(EmojiPickerSkinToneContext);
  if (!value) throw new Error(`EmojiPicker.SkinTone${part} must be inside <EmojiPicker.SkinTone>.`);
  return value;
}
