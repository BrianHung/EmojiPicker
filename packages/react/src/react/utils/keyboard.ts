import type * as React from "react";
import type { KeyboardEvent } from "@react-types/shared";
import type { FocusManager } from "react-aria/FocusScope";
import { useKeyboard } from "react-aria/useKeyboard";
import { isComposingKey } from "@brianhung/emoji-picker-core";
import { isSkipped, preventable, type PickerEvent } from "./events";

export type PickerKeyboardEventHandler<T extends Element = Element> = (event: PickerEvent<React.KeyboardEvent<T>>) => void;

// true: handled (preventDefault, stop); "native": stop but keep the browser's default; false: pass on
export type KeyResult = boolean | "native";

export function usePickerKeyDown<T extends Element>(user: PickerKeyboardEventHandler<T> | undefined, handle: (event: KeyboardEvent) => KeyResult, { stopSkipped = false } = {}): React.KeyboardEventHandler<T> {
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
    (keyboardProps.onKeyDown as unknown as React.KeyboardEventHandler<T>)(event);
  };
}

export function rovingStep(key: string, rtl: boolean, vertical = false): "first" | "last" | 1 | -1 | null {
  const [back, next] = vertical ? ["ArrowUp", "ArrowDown"] : rtl ? ["ArrowRight", "ArrowLeft"] : ["ArrowLeft", "ArrowRight"];
  return key === "Home" ? "first" : key === "End" ? "last" : key === next ? 1 : key === back ? -1 : null;
}

export function moveFocus(focus: FocusManager | undefined, key: string, rtl: boolean, vertical = false): boolean {
  const step = rovingStep(key, rtl, vertical);
  if (step === "first") focus?.focusFirst();
  else if (step === "last") focus?.focusLast();
  else if (step === 1) focus?.focusNext({ wrap: true });
  else if (step === -1) focus?.focusPrevious({ wrap: true });
  return step != null;
}

export const hasModifier = (event: { ctrlKey: boolean; metaKey: boolean; altKey: boolean }) => event.ctrlKey || event.metaKey || event.altKey;
