"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { mergePartProps } from "../../internals/mergePartProps";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import type { EmojiComponentsInteractionState, EmojiComponentsPartElementProps } from "../../internals/types";
import { useInteraction, type Clickable } from "../../internals/useInteraction";
import { SLOTS } from "../../internals/slots";

import { swatch } from "../skin-tone/utils/swatch";
import { useEmojiPickerSkinToneContext } from "../skin-tone/EmojiPickerSkinToneContext";
import * as EmojiPickerSkinToneTriggerDataAttributes from "./EmojiPickerSkinToneTriggerDataAttributes";
import type { EmojiPickerSkinToneState } from "../skin-tone/EmojiPickerSkinTone";

export type EmojiPickerSkinToneTriggerState = EmojiPickerSkinToneState & EmojiComponentsInteractionState;

export type EmojiPickerSkinToneTriggerProps = EmojiComponentsPartElementProps<EmojiPickerSkinToneTriggerState, HTMLButtonElement>;

export const EmojiPickerSkinToneTrigger = React.forwardRef<HTMLButtonElement, EmojiPickerSkinToneTriggerProps>(function EmojiPickerSkinToneTrigger({ style, children, ...props }, ref) {
  const { tone, open, toggle, label, triggerRef, optionsId } = useEmojiPickerSkinToneContext("Trigger");
  const { onClick, ...own } = mergePartProps<Clickable>(props, { onClick: (e: React.MouseEvent) => toggle(e.nativeEvent) });
  const interaction = useInteraction({ onClick });
  const state: EmojiPickerSkinToneTriggerState = { open, tone, ...interaction.state };
  const refs = React.useMemo(() => mergeRefs<HTMLButtonElement>(ref, triggerRef), [ref, triggerRef]);
  return renderElement(
    "button",
    {
      type: "button",
      ...mergeProps(own, interaction.props),
      ref: refs,
      "data-slot": SLOTS.skinToneTrigger,
      "aria-label": label(tone),
      "aria-expanded": open,
      "aria-controls": open ? optionsId : undefined,
      [EmojiPickerSkinToneTriggerDataAttributes.popupOpen]: flag(open),
      style: (s: EmojiPickerSkinToneTriggerState) => (children === undefined ? { ...swatch(tone), ...resolve(style, s) } : resolve(style, s)),
      children,
    },
    state,
  );
});

export declare namespace EmojiPickerSkinToneTrigger {
  type Props = EmojiPickerSkinToneTriggerProps;
  type State = EmojiPickerSkinToneTriggerState;
}
