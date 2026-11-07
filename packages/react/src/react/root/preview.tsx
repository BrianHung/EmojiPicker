"use client";

import * as React from "react";
import type { EmojiRecord } from "@brianhung/emoji-picker-core";
import { usePicker } from "./context";
import { useActiveEmoji } from "./hooks";
import { renderElement, type EmojiPickerPartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";

export type PreviewState = { emoji: EmojiRecord | null };

export type PreviewProps = EmojiPickerPartElementProps<PreviewState>;

export const Preview = React.forwardRef<HTMLDivElement, PreviewProps>(function Preview({ children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Preview");
  const active = useActiveEmoji();
  const caption = active ? `${active.imageUrl ? "" : active.emoji} ${active.name}`.trim() : labels.previewCaption;
  return renderElement("div", { "data-slot": SLOTS.preview, ...props, ref, children: children ?? caption }, { emoji: active });
});

export declare namespace Preview {
  type Props = PreviewProps;
  type State = PreviewState;
}
