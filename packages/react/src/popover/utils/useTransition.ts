"use client";

import * as React from "react";
import { useLatest } from "../../utils/useLatest";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import type { TransitionStatus } from "./types";

// Base UI's approach: entering for one frame, and mounted until the content's CSS animations and transitions finish
export function useTransition(open: boolean, node: React.RefObject<HTMLElement | null>, complete?: (open: boolean) => void) {
  const [status, setStatus] = React.useState<TransitionStatus | null>(open ? "idle" : null);
  const latest = useLatest(complete);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a transition starts on each change of open; status and the node are read as of that change
  useLayoutEffect(() => {
    if (!open && status === null) return;
    let live = true;
    const settle = (next: TransitionStatus | null) =>
      requestAnimationFrame(() =>
        Promise.all((node.current?.getAnimations?.() ?? []).map((a) => a.finished))
          .catch(() => {})
          .then(() => {
            if (!live) return;
            if (next === null) setStatus(null);
            latest.current?.(open);
          }),
      );
    if (open) {
      setStatus("starting");
      const frame = requestAnimationFrame(() => {
        if (!live) return;
        setStatus("idle");
        settle("idle");
      });
      return () => {
        live = false;
        cancelAnimationFrame(frame);
      };
    }
    setStatus("ending");
    settle(null);
    return () => void (live = false);
  }, [open]);
  return status;
}
