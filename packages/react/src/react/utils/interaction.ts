import { mergeProps } from "react-aria/mergeProps";
import { useFocusRing } from "react-aria/useFocusRing";
import { useHover } from "react-aria/useHover";
import { usePress } from "react-aria/usePress";
import type { InteractionState } from "./render";

// `pressed` comes from a React Aria hook that already handles presses, so a second usePress would fight it
export function useInteraction(disabled = false, pressed?: boolean) {
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { pressProps, isPressed } = usePress({ isDisabled: disabled });
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();
  const state: InteractionState = { hovered: isHovered, focused: isFocused, focusVisible: isFocusVisible, pressed: pressed ?? isPressed, disabled };
  return {
    state,
    props: mergeProps(hoverProps, pressed === undefined ? pressProps : null, focusProps, {
      "data-hovered": state.hovered || undefined,
      "data-pressed": state.pressed || undefined,
      "data-focus-visible": state.focusVisible || undefined,
      "data-disabled": disabled || undefined,
    }),
  };
}
