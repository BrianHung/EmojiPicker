"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { useOverlayTrigger } from "react-aria/useOverlayTrigger";
import { useOverlayTriggerState } from "react-stately/useOverlayTriggerState";
import { PopoverProvider } from "../../root/EmojiPopoverRootContext";
import type { AriaInternals } from "./EmojiPopoverRootContext";
import { finalFocusTarget } from "../../utils/focus";
import type { EmojiPopoverFinalFocus, EmojiPopoverRootActions, EmojiPopoverRootChangeEventDetails, EmojiPopoverRootChangeEventReason, EmojiPopoverRootProps } from "../../utils/types";
import { usePopoverState } from "../../utils/usePopoverState";

export function EmojiPopoverRoot({ children, modal = false, ...props }: EmojiPopoverRootProps) {
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const state = usePopoverState(props, trigger);
  // Only closes for its trigger scrolling away; the Trigger part opens and closes on press itself
  const overlay = useOverlayTriggerState({ isOpen: state.open, onOpenChange: (open) => state.setOpen(open, open ? "trigger-press" : "scroll") });
  const { triggerProps, overlayProps } = useOverlayTrigger({ type: "dialog" }, overlay, { current: trigger });
  const { onPress: _, ...aria } = triggerProps;
  const finalFocus = React.useRef<EmojiPopoverFinalFocus>(undefined);
  // React Aria's FocusScope returns focus to the Trigger unless it has moved out of the popup
  const wasOpen = React.useRef(state.open);
  React.useEffect(() => {
    const target = wasOpen.current && !state.open ? finalFocusTarget(state, finalFocus.current) : true;
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    wasOpen.current = state.open;
  }, [state]);
  const value: AriaInternals = { state, trigger, setTrigger, triggerProps: (props) => mergeProps(props, aria), id: overlayProps.id, modal, finalFocus };
  return <PopoverProvider value={value}>{children}</PopoverProvider>;
}

export declare namespace EmojiPopoverRoot {
  type Props = EmojiPopoverRootProps;
  type Actions = EmojiPopoverRootActions;
  type ChangeEventReason = EmojiPopoverRootChangeEventReason;
  type ChangeEventDetails = EmojiPopoverRootChangeEventDetails;
}
