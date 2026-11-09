"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";

import type { SkinToneValue } from "@emoji-components/core";
import { mergePartProps } from "../../internals/mergePartProps";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import type { EmojiComponentsInteractionState, EmojiComponentsPartElementProps } from "../../internals/types";
import { useInteraction, type Clickable } from "../../internals/useInteraction";
import { SLOTS } from "../../internals/slots";

import * as EmojiPickerSkinToneOptionDataAttributes from "./EmojiPickerSkinToneOptionDataAttributes";
import { swatch } from "../skin-tone/utils/swatch";
import { EmojiPickerSkinToneOptionContext, useEmojiPickerSkinToneContext } from "../skin-tone/EmojiPickerSkinToneContext";

export type EmojiPickerSkinToneOptionState = EmojiComponentsInteractionState & { tone: SkinToneValue; selected: boolean };

export type EmojiPickerSkinToneOptionProps = EmojiComponentsPartElementProps<EmojiPickerSkinToneOptionState, HTMLButtonElement, "role"> & {
  tone?: SkinToneValue;
};

export const EmojiPickerSkinToneOption = React.forwardRef<HTMLButtonElement, EmojiPickerSkinToneOptionProps>(function EmojiPickerSkinToneOption({ tone: toneProp, style, children, ...props }, ref) {
  const { tone: current, choose, label } = useEmojiPickerSkinToneContext("Option");
  const fromOptions = React.useContext(EmojiPickerSkinToneOptionContext);
  const tone = toneProp ?? fromOptions ?? 0;
  const { onClick, ...own } = mergePartProps<Clickable>(props, { onClick: (e: React.MouseEvent) => choose(tone, e.nativeEvent) });
  const interaction = useInteraction({ onClick });
  const selected = tone === current;
  return (
    <EmojiPickerSkinToneOptionContext.Provider value={tone}>
      {renderElement(
        "button",
        {
          type: "button",
          "aria-label": label(tone),
          "aria-pressed": selected,
          ...mergeProps(own, interaction.props),
          ref,
          tabIndex: selected ? 0 : -1,
          "data-slot": SLOTS.skinToneOption,
          [EmojiPickerSkinToneOptionDataAttributes.selected]: flag(selected),
          style: (s: EmojiPickerSkinToneOptionState) => (children === undefined ? { ...swatch(tone), ...resolve(style, s) } : resolve(style, s)),
          children,
        },
        { ...interaction.state, tone, selected },
      )}
    </EmojiPickerSkinToneOptionContext.Provider>
  );
});

export declare namespace EmojiPickerSkinToneOption {
  type Props = EmojiPickerSkinToneOptionProps;
  type State = EmojiPickerSkinToneOptionState;
}
