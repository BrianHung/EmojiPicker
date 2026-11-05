import * as React from "react";

/** A controlled value, or its own state seeded with the default; the setter calls `onChange` either way. */
export function useControllable<T, Next extends T = T>(controlled: T | undefined, initial: T, onChange: ((value: Next) => void) | undefined): [T, (value: Next) => void] {
  const [own, setOwn] = React.useState(initial);
  const latest = React.useRef({ controlled: controlled !== undefined, onChange });
  latest.current = { controlled: controlled !== undefined, onChange };
  const set = React.useCallback((value: Next) => {
    if (!latest.current.controlled) setOwn(value);
    latest.current.onChange?.(value);
  }, []);
  return [controlled === undefined ? own : controlled, set];
}
