"use client";

import type * as React from "react";
import type { KeyboardEvent } from "@react-types/shared";
import { useKeyboard } from "react-aria/useKeyboard";
import { isComposingKey } from "@brianhung/emoji-picker-core";
import { isSkipped, preventable } from "./mergePartProps";
import type { PickerEvent } from "./types";

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

export const hasModifier = (event: { ctrlKey: boolean; metaKey: boolean; altKey: boolean }) => event.ctrlKey || event.metaKey || event.altKey;
