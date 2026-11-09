"use client";

import * as React from "react";

// Before layout effects, so they and every handler read this render's value; never written while rendering
const useEarlyEffect = React.useInsertionEffect ?? React.useLayoutEffect;

export function useLatest<T>(value: T): { readonly current: T } {
  const ref = React.useRef(value);
  useEarlyEffect(() => {
    ref.current = value;
  });
  return ref;
}

// Base UI's useStableCallback: one identity for the component's life, calling the latest function
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const latest = useLatest(fn);
  return React.useCallback((...args: A) => latest.current(...args), [latest]);
}
