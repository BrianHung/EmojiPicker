// Holds frequents and reactions steady while the user works in the picker: nothing should move under them
import * as React from "react";

export function useActiveWithin(root: React.RefObject<HTMLElement | null>, onChange: (active: boolean) => void) {
  const latest = React.useRef(onChange);
  latest.current = onChange;
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const state = { focus: el.contains(document.activeElement), pointer: false };
    const update = (key: keyof typeof state, value: boolean) => {
      state[key] = value;
      latest.current(state.focus || state.pointer);
    };
    const focusIn = () => update("focus", true);
    const focusOut = (e: FocusEvent) => !(e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) && update("focus", false);
    const enter = () => update("pointer", true);
    const leave = () => update("pointer", false);
    if (state.focus) latest.current(true);
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
  }, [root]);
}
