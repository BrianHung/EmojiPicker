"use client";

import * as React from "react";
import type { ChangeDetails } from "@emoji-components/core";
import { useControlledState } from "react-stately/useControlledState";
import { useLatest } from "./useLatest";

// React Stately's controlled state with Base UI's onChange(value, details): the owner hears first and can cancel()
export function useChangeState<T, D extends ChangeDetails>(value: Exclude<T, undefined> | undefined, defaultValue: Exclude<T, undefined>, onChange: ((value: T, details: D) => void) | undefined) {
  const [current, setCurrent] = useControlledState<T>(value, defaultValue);
  const latest = useLatest({ current, onChange });
  const set = React.useCallback(
    (next: T, details: D): D | undefined => {
      if (Object.is(next, latest.current.current)) return undefined;
      latest.current.onChange?.(next, details);
      if (!details.isCanceled) setCurrent(next);
      return details;
    },
    [latest, setCurrent],
  );
  return [current, set] as const;
}
