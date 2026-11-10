"use client";

import * as React from "react";
import { unifiedToNative, type EmojiRecord } from "@emoji-components/core";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { useStore } from "../../utils/useStore";
import { renderElement } from "../../internals/renderElement";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

// unified is the highlighted cell's code points, with its skin tone
export type EmojiPickerPreviewState = { emoji: EmojiRecord | null; unified: string | null };

export type EmojiPickerPreviewProps = EmojiComponentsPartElementProps<EmojiPickerPreviewState>;

export const EmojiPickerPreview = React.forwardRef<HTMLDivElement, EmojiPickerPreviewProps>(function EmojiPickerPreview({ children, ...props }, ref) {
  const { labels, state } = useEmojiPickerRootContext("EmojiPicker.Preview");
  const active = useStore(state, (s) => s.active);
  const caption = active ? `${active.record.imageUrl ? "" : unifiedToNative(active.unified)} ${active.record.name}`.trim() : labels.previewCaption;
  return renderElement("div", { ...props, "data-slot": SLOTS.preview, ref, children: children ?? caption }, { emoji: active?.record ?? null, unified: active?.unified ?? null });
});

export declare namespace EmojiPickerPreview {
  type Props = EmojiPickerPreviewProps;
  type State = EmojiPickerPreviewState;
}
