import type * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { useFocusRing } from "react-aria/useFocusRing";
import { useHover } from "react-aria/useHover";
import { usePress } from "react-aria/usePress";
import { flag, type InteractionState } from "./render";

export type Clickable = { onClick?: (e: React.MouseEvent) => void };
type Options = Clickable & { disabled?: boolean; pressed?: boolean; preventFocusOnPress?: boolean };

// `pressed` comes from a React Aria hook that already handles presses, so a second usePress would fight it.
// usePress cancels a button's native keyboard click (Space, and Enter outside macOS), so onClick goes through it.
export function useInteraction({ disabled = false, pressed, preventFocusOnPress, onClick }: Options = {}) {
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { pressProps, isPressed } = usePress({ isDisabled: disabled, preventFocusOnPress, onClick });
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();
  const state: InteractionState = { hovered: isHovered, focused: isFocused, focusVisible: isFocusVisible, pressed: pressed ?? isPressed, disabled };
  return {
    state,
    props: mergeProps(hoverProps, pressed === undefined ? pressProps : { onClick }, focusProps, {
      "data-hovered": flag(state.hovered),
      "data-pressed": flag(state.pressed),
      "data-focus-visible": flag(state.focusVisible),
      "data-disabled": flag(disabled),
    }),
  };
}
