"use client";

import * as React from "react";
import { useObjectRef } from "react-aria/useObjectRef";
import { useDialog } from "react-aria/useDialog";
import { mergePartProps } from "../../../internals/mergePartProps";
import { renderElement } from "../../../internals/renderElement";
import { useLayoutEffect } from "../../../utils/useLayoutEffect";
import { useEmojiPopoverRootContext } from "../../root/EmojiPopoverRootContext";
import { initialFocusTarget } from "../../utils/focus";
import { popupAttributes, usePopupAttributes } from "../../utils/popupAttributes";
import type { EmojiPopoverPopupProps, EmojiPopoverPopupState } from "../../utils/types";
import { useEmojiPopoverPositionerContext } from "../positioner/EmojiPopoverPositionerContext";
import type { AriaInternals } from "../root/EmojiPopoverRootContext";

export const EmojiPopoverPopup = React.forwardRef<HTMLDivElement, EmojiPopoverPopupProps>(function EmojiPopoverPopup({ initialFocus, finalFocus, className, style, render, children, ...props }, ref) {
  const p = useEmojiPopoverRootContext<AriaInternals>("Popup");
  const { state: placed, status } = useEmojiPopoverPositionerContext("EmojiPopover");
  const node = useObjectRef(ref);
  useLayoutEffect(() => void (p.finalFocus.current = finalFocus));
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on mount, before useDialog focuses the popup itself
  React.useEffect(() => {
    const target = initialFocusTarget(p.state, initialFocus, node.current);
    if (target) target.focus({ preventScroll: true });
  }, []);
  const attributes = usePopupAttributes(props);
  const { dialogProps } = useDialog({ "aria-label": attributes["aria-label"], "aria-labelledby": props["aria-labelledby"] }, node);
  const state: EmojiPopoverPopupState = { ...placed, transitionStatus: status };
  return renderElement("div", { ...mergePartProps(props, dialogProps, { id: p.id }), ...attributes, ...popupAttributes(state), ref: node, className, style, render, children }, state);
});

export declare namespace EmojiPopoverPopup {
  type Props = EmojiPopoverPopupProps;
  type State = EmojiPopoverPopupState;
}
