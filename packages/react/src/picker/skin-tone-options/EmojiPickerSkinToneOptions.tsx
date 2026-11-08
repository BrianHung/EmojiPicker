"use client";

import * as React from "react";
import { FocusScope } from "react-aria/FocusScope";
import { mergeRefs } from "react-aria/mergeRefs";

import type { SkinToneValue } from "@brianhung/emoji-picker-core";
import { SKIN_TONE_VALUES } from "@brianhung/emoji-picker-core/internal";
import { ToolbarPart } from "../../internals/ToolbarPart";
import { resolve } from "../../internals/renderElement";
import type { EmojiPickerOrientation, EmojiPickerPartElementProps, EmojiPickerPartProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

import { EmojiPickerSkinToneOptionContext, useEmojiPickerSkinToneContext } from "../skin-tone/EmojiPickerSkinToneContext";
import { EmojiPickerSkinToneOption } from "../skin-tone-option/EmojiPickerSkinToneOption";

export type EmojiPickerSkinToneOptionsState = { orientation: EmojiPickerOrientation; tone: SkinToneValue };

export type EmojiPickerSkinToneOptionsProps = Omit<EmojiPickerPartElementProps<EmojiPickerSkinToneOptionsState>, "children" | "role" | keyof EmojiPickerPartProps<EmojiPickerSkinToneOptionsState>> &
  EmojiPickerPartProps<EmojiPickerSkinToneOptionsState, HTMLDivElement> & {
    children?: (tone: SkinToneValue) => React.ReactNode;
  };

export const EmojiPickerSkinToneOptions = React.forwardRef<HTMLDivElement, EmojiPickerSkinToneOptionsProps>(function EmojiPickerSkinToneOptions(props, ref) {
  const { open } = useEmojiPickerSkinToneContext("Options");
  if (!open) return null;
  return (
    <FocusScope autoFocus>
      <SkinToneGroup {...props} ref={ref} />
    </FocusScope>
  );
});

const SkinToneGroup = React.forwardRef<HTMLDivElement, EmojiPickerSkinToneOptionsProps>(function SkinToneGroup({ style, children, ...props }, ref) {
  const { orientation, group, tone, optionsRef, optionsId } = useEmojiPickerSkinToneContext("Options");
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, optionsRef), [ref, optionsRef]);
  return (
    <ToolbarPart
      id={optionsId}
      aria-label={group}
      {...props}
      toolbarRef={refs}
      orientation={orientation}
      state={{ orientation, tone }}
      data-slot={SLOTS.skinToneOptions}
      style={(s: EmojiPickerSkinToneOptionsState) => ({ position: "absolute", zIndex: 4, background: "var(--emoji-picker-background, Canvas)", ...(orientation === "vertical" ? { flexDirection: "column" } : null), ...resolve(style, s) })}
    >
      {SKIN_TONE_VALUES.map((t) => (
        <EmojiPickerSkinToneOptionContext.Provider key={t} value={t}>
          {children ? children(t) : <EmojiPickerSkinToneOption tone={t} />}
        </EmojiPickerSkinToneOptionContext.Provider>
      ))}
    </ToolbarPart>
  );
});

export declare namespace EmojiPickerSkinToneOptions {
  type Props = EmojiPickerSkinToneOptionsProps;
  type State = EmojiPickerSkinToneOptionsState;
}
