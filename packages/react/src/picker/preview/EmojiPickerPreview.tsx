"use client";

import * as React from "react";
import type { EmojiRecord } from "@emoji-components/core";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { useActiveEmoji } from "../root/utils/useActiveEmoji";
import { renderElement } from "../../internals/renderElement";
import type { EmojiPickerPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

export type EmojiPickerPreviewState = { emoji: EmojiRecord | null };

export type EmojiPickerPreviewProps = EmojiPickerPartElementProps<EmojiPickerPreviewState>;

export const EmojiPickerPreview = React.forwardRef<HTMLDivElement, EmojiPickerPreviewProps>(function EmojiPickerPreview({ children, ...props }, ref) {
  const { labels } = useEmojiPickerRootContext("EmojiPicker.Preview");
  const active = useActiveEmoji();
  const caption = active ? `${active.imageUrl ? "" : active.emoji} ${active.name}`.trim() : labels.previewCaption;
  return renderElement("div", { "data-slot": SLOTS.preview, ...props, ref, children: children ?? caption }, { emoji: active });
});

export declare namespace EmojiPickerPreview {
  type Props = EmojiPickerPreviewProps;
  type State = EmojiPickerPreviewState;
}
