"use client";

// A toolbar of toggle buttons, as Base UI's ToggleGroup, not radios: the arrows move focus without checking, and a press picks

import * as React from "react";
import { useObjectRef } from "react-aria/useObjectRef";
import { useInteractOutside } from "react-aria/useInteractOutside";

import type { ChangeDetails, SkinToneValue } from "@brianhung/emoji-picker-core";
import { createChangeDetails } from "@brianhung/emoji-picker-core/internal";
import { useStableCallback } from "../../utils/useLatest";
import { useChangeState } from "../../utils/useChangeState";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import { useSkinTone } from "../../provider/utils/useSkinTone";
import { EmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { mergePartProps } from "../../internals/mergePartProps";
import { usePickerKeyDown } from "../../internals/usePickerKeyDown";
import { useEmojiContext } from "../../provider/EmojiProviderContext";
import { flag, renderElement } from "../../internals/renderElement";
import type { EmojiPickerOrientation, EmojiPickerPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

import { EmojiPickerSkinToneOptions } from "../skin-tone-options/EmojiPickerSkinToneOptions";
import { EmojiPickerSkinToneTrigger } from "../skin-tone-trigger/EmojiPickerSkinToneTrigger";
import * as EmojiPickerSkinToneDataAttributes from "./EmojiPickerSkinToneDataAttributes";
import { type EmojiPickerSkinToneContext as Context, EmojiPickerSkinToneContext } from "./EmojiPickerSkinToneContext";

export type EmojiPickerSkinToneState = { open: boolean; tone: SkinToneValue };

export type EmojiPickerSkinToneProps = EmojiPickerPartElementProps<EmojiPickerSkinToneState> & {
  orientation?: EmojiPickerOrientation;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: EmojiPickerSkinToneChangeEventDetails) => void;
};

export type EmojiPickerSkinToneChangeEventReason = "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "imperative-action" | "none";
export type EmojiPickerSkinToneChangeEventDetails = ChangeDetails<EmojiPickerSkinToneChangeEventReason>;

export const EmojiPickerSkinTone = React.forwardRef<HTMLDivElement, EmojiPickerSkinToneProps>(function EmojiPickerSkinTone(
  { orientation = "horizontal", open: openProp, defaultOpen = false, onOpenChange, onKeyDown, children, ...props },
  ref,
) {
  const [tone, setTone] = useSkinTone();
  const [open, change] = useChangeState(openProp, defaultOpen, onOpenChange);
  const rootRef = useObjectRef(ref);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const setOpen = (next: boolean, reason: EmojiPickerSkinToneChangeEventReason, event?: Event) => change(next, createChangeDetails(reason, event, triggerRef.current ?? undefined));
  const optionsRef = React.useRef<HTMLDivElement | null>(null);
  const outside = (event: PointerEvent) => setOpen(false, "outside-press", event);
  useInteractOutside({ ref: rootRef, isDisabled: !open, onInteractOutsideStart: outside, onInteractOutside: outside });

  const { labels } = useEmojiContext();
  const optionsId = React.useId();
  const close = (reason: EmojiPickerSkinToneChangeEventReason, event?: Event) => {
    const inside = optionsRef.current?.contains(document.activeElement);
    const details = setOpen(false, reason, event);
    if (inside && details && !details.isCanceled) triggerRef.current?.focus();
    return details;
  };
  const toggle = (event?: Event) => (open ? close(event ? "trigger-press" : "imperative-action", event) : setOpen(true, event ? "trigger-press" : "imperative-action", event));
  const toggles = React.useContext(EmojiPickerRootContext)?.skinTone;
  const imperativeToggle = useStableCallback(() => void toggle());
  useLayoutEffect(() => {
    if (!toggles) return;
    toggles.current = imperativeToggle;
    return () => {
      if (toggles.current === imperativeToggle) toggles.current = null;
    };
  }, [toggles, imperativeToggle]);
  const keys = usePickerKeyDown(onKeyDown, (e) => {
    if (!open || e.key !== "Escape") return false;
    return !close("escape-key", e.nativeEvent)?.isPropagationAllowed;
  });
  // Focus that leaves for the page closes the options, as it does the variations
  const onBlur = (e: React.FocusEvent) => open && !rootRef.current?.contains(e.relatedTarget as Node | null) && setOpen(false, "focus-out", e.nativeEvent);

  const context: Context = {
    tone,
    open,
    orientation,
    toggle,
    choose(next, event) {
      setTone(next, { reason: "item-press", event });
      close("item-press", event);
    },
    label: (i) => labels.skinTones[i]!,
    group: labels.skinTone,
    optionsId,
    triggerRef,
    optionsRef,
  };
  return (
    <EmojiPickerSkinToneContext.Provider value={context}>
      {renderElement(
        "div",
        {
          ...mergePartProps(props, { onBlur }),
          onKeyDown: keys,
          ref: rootRef,
          "data-slot": SLOTS.skinTone,
          [EmojiPickerSkinToneDataAttributes.closed]: flag(!open),
          children: children ?? (
            <>
              <EmojiPickerSkinToneTrigger />
              <EmojiPickerSkinToneOptions />
            </>
          ),
        },
        { open, tone },
        ["open"],
      )}
    </EmojiPickerSkinToneContext.Provider>
  );
});

export declare namespace EmojiPickerSkinTone {
  type Props = EmojiPickerSkinToneProps;
  type State = EmojiPickerSkinToneState;
  type ChangeEventReason = EmojiPickerSkinToneChangeEventReason;
  type ChangeEventDetails = EmojiPickerSkinToneChangeEventDetails;
}
