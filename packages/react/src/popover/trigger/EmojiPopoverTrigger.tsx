"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { mergePartProps } from "../../internals/mergePartProps";
import { flag, renderElement } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import { type Clickable, useInteraction } from "../../internals/useInteraction";
import { useEmojiPopoverRootContext } from "../root/EmojiPopoverRootContext";
import * as CommonTriggerDataAttributes from "../utils/CommonTriggerDataAttributes";
import type { EmojiPopoverTriggerProps } from "../utils/types";

export const EmojiPopoverTrigger: React.ForwardRefExoticComponent<EmojiPopoverTriggerProps & React.RefAttributes<HTMLButtonElement>> = React.forwardRef<HTMLButtonElement, EmojiPopoverTriggerProps>(function EmojiPopoverTrigger(
  { render, className, style, children, ...props },
  ref,
) {
  const { state, setTrigger, triggerProps } = useEmojiPopoverRootContext("Trigger");
  const toggle = (e: React.MouseEvent) => state.setOpen(!state.open, "trigger-press", e.nativeEvent);
  const refs = React.useMemo(() => mergeRefs<HTMLButtonElement>(setTrigger, ref), [setTrigger, ref]);
  const { onClick, ...own } = mergePartProps<Clickable>(
    { type: render ? undefined : "button", ...props },
    { "aria-haspopup": "dialog", "aria-expanded": state.open, "data-slot": SLOTS.popoverTrigger, [CommonTriggerDataAttributes.popupOpen]: flag(state.open), onClick: toggle },
  );
  const interaction = useInteraction({ disabled: props.disabled, onClick });
  const merged = triggerProps(mergeProps(own, interaction.props));
  return renderElement("button", { ...merged, ref: refs, render, className, style, children }, { ...interaction.state, open: state.open });
});
