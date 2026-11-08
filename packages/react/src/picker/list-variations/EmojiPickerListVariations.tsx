"use client";

import * as React from "react";
import type { EmojiRecord, SkinToneValue } from "@brianhung/emoji-picker-core";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import type { EmojiPickerPartElementProps } from "../../internals/types";
import { useLayoutEffect } from "../../utils/useLayoutEffect";

import { VariationsPopup } from "./VariationsPopup";

export type EmojiPickerListVariationsState = { emoji: EmojiRecord; tone: SkinToneValue };

export type EmojiPickerListVariationsProps = Omit<EmojiPickerPartElementProps<EmojiPickerListVariationsState, HTMLDivElement, "role">, "children"> & {
  children?: (tone: SkinToneValue) => React.ReactNode;
};

export const EmojiPickerListVariations = React.forwardRef<HTMLDivElement, EmojiPickerListVariationsProps>(function EmojiPickerListVariations(props, ref) {
  const { variations } = useEmojiPickerRootContext("EmojiPicker.ListVariations");
  const { register } = variations;
  useLayoutEffect(() => register(), [register]);
  return <VariationsPopup {...props} ref={ref} />;
});

export declare namespace EmojiPickerListVariations {
  type Props = EmojiPickerListVariationsProps;
  type State = EmojiPickerListVariationsState;
}
