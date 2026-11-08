"use client";

import type * as React from "react";
import { flag } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import { useEmojiLabels } from "../../provider/utils/useEmojiLabels";
import * as CommonPopupDataAttributes from "./CommonPopupDataAttributes";
import type { EmojiPopoverPopupState, EmojiPopoverPositionerState } from "./types";

const openAttributes = (open: boolean) => ({ [CommonPopupDataAttributes.open]: flag(open), [CommonPopupDataAttributes.closed]: flag(!open) });

export const positionerAttributes = ({ open, side, align }: EmojiPopoverPositionerState, slot: string) => ({
  role: "presentation",
  "data-slot": slot,
  ...openAttributes(open),
  [CommonPopupDataAttributes.side]: side,
  [CommonPopupDataAttributes.align]: align,
});

export const popupAttributes = ({ open, side, align, transitionStatus }: EmojiPopoverPopupState) => ({
  ...openAttributes(open),
  [CommonPopupDataAttributes.side]: side,
  [CommonPopupDataAttributes.align]: align,
  [CommonPopupDataAttributes.startingStyle]: flag(transitionStatus === "starting"),
  [CommonPopupDataAttributes.endingStyle]: flag(transitionStatus === "ending"),
});

export const closedPointerEvents = (open: boolean): React.CSSProperties | undefined => (open ? undefined : { pointerEvents: "none" });

export function usePopupAttributes(props: React.AriaAttributes) {
  const { picker } = useEmojiLabels();
  return { role: "dialog", "aria-label": props["aria-label"] ?? (props["aria-labelledby"] ? undefined : picker), "data-slot": SLOTS.popoverPopup };
}
