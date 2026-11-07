"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { useFocusWithin } from "react-aria/useFocusWithin";

export function useActiveWithin(onChange: (active: boolean) => void): React.HTMLAttributes<HTMLElement> {
  const active = React.useRef({ focus: false, pointer: false });
  const update = (key: "focus" | "pointer", value: boolean) => {
    active.current = { ...active.current, [key]: value };
    onChange(active.current.focus || active.current.pointer);
  };
  const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: (focus) => update("focus", focus) });
  return mergeProps(focusWithinProps, { onPointerEnter: () => update("pointer", true), onPointerLeave: () => update("pointer", false) });
}
