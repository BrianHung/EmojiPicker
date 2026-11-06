import type * as React from "react";
import type { KeyboardEvent } from "@react-types/shared";
import type { FocusManager } from "react-aria/FocusScope";
import { useKeyboard } from "react-aria/useKeyboard";
import { flipForRtl, isComposingKey, KEY_MOVES } from "@brianhung/emoji-picker-core";
import { isSkipped, preventable, type PickerEvent } from "./events";

export type PickerKeyboardEventHandler<T extends Element = Element> = (event: PickerEvent<React.KeyboardEvent<T>>) => void;

// true: handled (preventDefault, stop); "native": stop but keep the browser's default; false: pass on
export type KeyResult = boolean | "native";

export function usePickerKeyDown<T extends HTMLElement>(user: PickerKeyboardEventHandler<T> | undefined, handle: (event: KeyboardEvent) => KeyResult, { stopSkipped = false } = {}): React.KeyboardEventHandler<T> {
  const { keyboardProps } = useKeyboard({
    onKeyDown(event) {
      if (isSkipped(event)) return stopSkipped ? undefined : event.continuePropagation();
      const result = isComposingKey(event.nativeEvent) ? false : handle(event);
      if (!result) return event.continuePropagation();
      if (result === true) event.preventDefault();
    },
  });
  return (event) => {
    user?.(preventable(event));
    keyboardProps.onKeyDown?.(event);
  };
}

// Arrows along the orientation, then Home and End: moves focus among a FocusScope's items
export function moveFocus(focus: FocusManager | undefined, key: string, rtl: boolean, orientation: "horizontal" | "vertical" = "horizontal"): boolean {
  const move = KEY_MOVES[key] && flipForRtl(KEY_MOVES[key], rtl && orientation === "horizontal");
  const [back, next] = orientation === "vertical" ? ["up", "down"] : ["left", "right"];
  if (move === "first") focus?.focusFirst();
  else if (move === "last") focus?.focusLast();
  else if (move === next) focus?.focusNext({ wrap: true });
  else if (move === back) focus?.focusPrevious({ wrap: true });
  else return false;
  return true;
}

export const hasModifier = (event: { ctrlKey: boolean; metaKey: boolean; altKey: boolean }) => event.ctrlKey || event.metaKey || event.altKey;
