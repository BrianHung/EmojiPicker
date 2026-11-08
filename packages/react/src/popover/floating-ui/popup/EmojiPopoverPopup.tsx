"use client";

import * as React from "react";
import { FloatingFocusManager, useMergeRefs } from "@floating-ui/react";
import { mergePartProps } from "../../../internals/mergePartProps";
import { renderElement } from "../../../internals/renderElement";
import { useLatest } from "../../../utils/useLatest";
import { useEmojiPopoverRootContext } from "../../root/EmojiPopoverRootContext";
import { finalFocusTarget, initialFocusTarget } from "../../utils/focus";
import { popupAttributes, usePopupAttributes } from "../../utils/popupAttributes";
import type { EmojiPopoverPopupProps, EmojiPopoverPopupState } from "../../utils/types";
import { useEmojiPopoverPositionerContext } from "../positioner/EmojiPopoverPositionerContext";
import type { FloatingInternals } from "../root/EmojiPopoverRootContext";

export const EmojiPopoverPopup = React.forwardRef<HTMLDivElement, EmojiPopoverPopupProps>(function EmojiPopoverPopup({ initialFocus, finalFocus, className, style, render, children, ...props }, ref) {
  const p = useEmojiPopoverRootContext<FloatingInternals>("Popup");
  const { context, state: placed, status, floatingProps } = useEmojiPopoverPositionerContext("EmojiPopover");
  const mergedRef = useMergeRefs([p.popup, ref]);
  const latest = useLatest({ initialFocus, finalFocus, p });
  // Read by FloatingFocusManager as it moves focus; leaving focus in place is focusing what already has it
  const [focusTarget] = React.useState(
    () =>
      ({
        get current() {
          const { initialFocus, p } = latest.current;
          const target = initialFocusTarget(p.state, initialFocus, p.popup.current);
          return target === false ? (p.popup.current?.ownerDocument.activeElement as HTMLElement | null) : target;
        },
      }) as React.MutableRefObject<HTMLElement | null>,
  );
  const [returnTarget] = React.useState(
    () =>
      ({
        get current() {
          const { finalFocus, p } = latest.current;
          const target = finalFocusTarget(p.state, finalFocus);
          return target === true ? p.trigger : target || null;
        },
      }) as React.MutableRefObject<HTMLElement | null>,
  );
  const state: EmojiPopoverPopupState = { ...placed, transitionStatus: status };
  const attributes = usePopupAttributes(props);
  return (
    <FloatingFocusManager context={context} modal={p.modal} disabled={!p.state.open} initialFocus={initialFocus === false ? -1 : focusTarget} returnFocus={finalFocus === undefined ? true : returnTarget}>
      {renderElement("div", { ...floatingProps(mergePartProps(props)), ...attributes, ...popupAttributes(state), ref: mergedRef, className, style, render, children }, state)}
    </FloatingFocusManager>
  );
});

export declare namespace EmojiPopoverPopup {
  type Props = EmojiPopoverPopupProps;
  type State = EmojiPopoverPopupState;
}
