"use client";

import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { ReactionsContext } from "../root/EmojiPickerRootContext";
import { renderElement, resolve } from "../../internals/renderElement";
import type { EmojiPickerPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";
import { useLayoutEffect } from "../../utils/useLayoutEffect";

export type EmojiPickerPanelState = { hidden: boolean };
export type EmojiPickerPanelProps = EmojiPickerPartElementProps<EmojiPickerPanelState, HTMLDivElement, "hidden">;

export const EmojiPickerPanel = React.forwardRef<HTMLDivElement, EmojiPickerPanelProps>(function EmojiPickerPanel({ style, ...props }, ref) {
  const state = React.useContext(ReactionsContext);
  const register = state?.registerPanel;
  useLayoutEffect(() => register?.(), [register]);
  const hidden = Boolean(state?.open);
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, state?.panel), [ref, state?.panel]);
  return renderElement(
    "div",
    { "data-slot": SLOTS.panel, id: state?.panelId, ...props, ref: refs, hidden, inert: hidden || undefined, style: (s: EmojiPickerPanelState) => (s.hidden ? { ...resolve(style, s), display: "none" } : resolve(style, s)) },
    { hidden },
  );
});

export declare namespace EmojiPickerPanel {
  type Props = EmojiPickerPanelProps;
  type State = EmojiPickerPanelState;
}
