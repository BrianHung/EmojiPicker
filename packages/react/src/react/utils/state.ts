import * as React from "react";
import { createChangeDetails, type ChangeDetails } from "@brianhung/emoji-picker-core";
import { useControlledState } from "react-stately/useControlledState";

export function useChangeState<T, Reason extends string, Extra extends object = object>(value: T | undefined, defaultValue: T, onChange: ((value: T, details: ChangeDetails<Reason> & Extra) => void) | undefined) {
  const [current, setCurrent] = useControlledState<T>(value as Exclude<T, undefined>, defaultValue as Exclude<T, undefined>);
  const latest = React.useRef({ current, onChange });
  latest.current = { current, onChange };
  const set = React.useCallback(
    (next: T, reason: Reason, event?: Event, extra?: Extra) => {
      if (Object.is(next, latest.current.current)) return undefined;
      const details = Object.assign(createChangeDetails(reason, event), extra) as ChangeDetails<Reason> & Extra;
      latest.current.onChange?.(next, details);
      if (!details.isCanceled) setCurrent(next);
      return details;
    },
    [setCurrent],
  );
  return [current, set] as const;
}
