// Internal: keeps a value steady while the user is working in the picker.
import * as React from "react";

/**
 * `value`, held while focus or the pointer is inside `root`, and caught up once
 * both leave. Picking records a use, which reorders the frequently used row; held,
 * the emoji under the pointer or the focused cell stays put, so the user can keep
 * picking (as Slack and Discord do).
 */
export function useHeldWhileActive<T>(value: T, root: React.RefObject<HTMLElement | null>): T {
  const [held, setHeld] = React.useState(value);
  const active = React.useRef({ focus: false, pointer: false });
  const latest = React.useRef(value);
  latest.current = value;
  const catchUp = React.useCallback(() => {
    if (!active.current.focus && !active.current.pointer) setHeld(latest.current);
  }, []);

  React.useEffect(catchUp, [value, catchUp]);
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const state = active.current;
    const focusIn = () => void (state.focus = true);
    const focusOut = (e: FocusEvent) => {
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      state.focus = false;
      catchUp();
    };
    const enter = () => void (state.pointer = true);
    const leave = () => {
      state.pointer = false;
      catchUp();
    };
    state.focus = el.contains(document.activeElement);
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [root, catchUp]);
  return held;
}
