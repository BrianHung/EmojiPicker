"use client";

import type * as React from "react";
import type { PressEvent } from "@react-types/shared";
import { mergeProps } from "react-aria/mergeProps";
import { useFocusRing } from "react-aria/useFocusRing";
import { useHover } from "react-aria/useHover";
import { usePress } from "react-aria/usePress";
import { stateAttributes, type EmojiPickerInteractionState } from "./render";

export type Clickable = { onClick?: (e: React.MouseEvent) => void };

interface InteractionOptions extends Clickable {
  disabled?: boolean;
  pressed?: boolean;
  preventFocusOnPress?: boolean;
  onPress?: (event: PressEvent) => void;
}

const ATTRIBUTES = ["hovered", "pressed", "focusVisible", "disabled"] as const;

// React Aria's press, hover, and focus ring for one part. `pressed` comes from a hook that already handles presses, so a second usePress would fight it.
// usePress cancels a button's native keyboard click (Space, and Enter outside macOS), so onClick goes through it.
export function useInteraction({ disabled = false, pressed, preventFocusOnPress, onPress, onClick }: InteractionOptions = {}) {
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { pressProps, isPressed } = usePress({ isDisabled: disabled, preventFocusOnPress, onPress, onClick });
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();
  const state: EmojiPickerInteractionState = { hovered: isHovered, focused: isFocused, focusVisible: isFocusVisible, pressed: pressed ?? isPressed, disabled };
  return { state, props: mergeProps(hoverProps, pressed === undefined ? pressProps : { onClick }, focusProps, stateAttributes(state, ATTRIBUTES)) };
}
