import * as React from "react";
import { createChangeDetails, type ChangeDetails } from "@brianhung/emoji-picker-core";
import { useControlledState } from "react-stately/useControlledState";

export function useChangeState<T, Reason extends string>(value: T | undefined, defaultValue: T, onChange: ((value: T, details: ChangeDetails<Reason>) => void) | undefined) {
  const [current, setCurrent] = useControlledState<T>(value as Exclude<T, undefined>, defaultValue as Exclude<T, undefined>);
  const latest = React.useRef({ current, onChange });
  latest.current = { current, onChange };
  const set = React.useCallback(
    (next: T, reason: Reason, event?: Event) => {
      if (Object.is(next, latest.current.current)) return;
      const details = createChangeDetails(reason, event);
      latest.current.onChange?.(next, details);
      if (!details.isCanceled) setCurrent(next);
    },
    [setCurrent],
  );
  return [current, set] as const;
}
