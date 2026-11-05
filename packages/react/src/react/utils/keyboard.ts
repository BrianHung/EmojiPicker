import type * as React from "react";
import type { KeyboardEvent } from "@react-types/shared";
import type { FocusManager } from "react-aria/FocusScope";
import { useKeyboard } from "react-aria/useKeyboard";
import { isComposingKey } from "@brianhung/emoji-picker-core";

export type PickerKeyboardEvent<T extends Element = Element> = React.KeyboardEvent<T> & {
  preventEmojiPickerHandler: () => void;
};
export type PickerKeyboardEventHandler<T extends Element = Element> = (event: PickerKeyboardEvent<T>) => void;

// true: handled (preventDefault, stop); "native": stop but keep the browser's default; false: pass on
export type KeyResult = boolean | "native";

const skipped = new WeakSet<Event>();

export function usePickerKeyDown<T extends Element>(user: PickerKeyboardEventHandler<T> | undefined, handle: (event: KeyboardEvent) => KeyResult, { stopSkipped = false } = {}): React.KeyboardEventHandler<T> {
  const { keyboardProps } = useKeyboard({
    onKeyDown(event) {
      if (skipped.has(event.nativeEvent)) return stopSkipped ? undefined : event.continuePropagation();
      const result = isComposingKey(event.nativeEvent) ? false : handle(event);
      if (!result) return event.continuePropagation();
      if (result === true) event.preventDefault();
    },
  });
  return (event) => {
    const native = event.nativeEvent;
    (event as PickerKeyboardEvent<T>).preventEmojiPickerHandler = () => void skipped.add(native);
    user?.(event as PickerKeyboardEvent<T>);
    (keyboardProps.onKeyDown as unknown as React.KeyboardEventHandler<T>)(event);
  };
}

export function moveFocus(focus: FocusManager | undefined, key: string, rtl: boolean, vertical = false): boolean {
  const [back, next] = vertical ? ["ArrowUp", "ArrowDown"] : rtl ? ["ArrowRight", "ArrowLeft"] : ["ArrowLeft", "ArrowRight"];
  if (key === "Home") focus?.focusFirst();
  else if (key === "End") focus?.focusLast();
  else if (key === next) focus?.focusNext({ wrap: true });
  else if (key === back) focus?.focusPrevious({ wrap: true });
  else return false;
  return true;
}

export const hasModifier = (event: { ctrlKey: boolean; metaKey: boolean; altKey: boolean }) => event.ctrlKey || event.metaKey || event.altKey;
