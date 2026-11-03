// Internal: a tapback's reaction row on top of the engine's (a <ul> of buttons).
import * as React from "react";
import { SKIN_TONES } from "../core/dataset";

/** The user's current reactions (base unified codes), for aria-pressed on their buttons. */
export const SelectedReactionsContext = React.createContext<ReadonlySet<string> | null>(null);

const TONES = new Set<string>(SKIN_TONES);
/** A code without skin-tone modifiers, lowercased: how reactions are compared. */
export const reactionKey = (unified: string) =>
  unified
    .toLowerCase()
    .split("-")
    .filter((part) => !TONES.has(part))
    .join("-");

/** Whether a reaction button's emoji is one of the user's, in any skin tone. */
export const isPressed = (selected: ReadonlySet<string>, unified: string) => selected.has(reactionKey(unified));

/**
 * One tab stop for the row (roving tabindex): the last focused button, else the
 * first. Arrows, Home and End move along it. The engine renders every button
 * tabbable, so this sets tabIndex on its markup after each render.
 */
export function useRovingRow(row: React.RefObject<HTMLElement | null>) {
  const current = React.useRef(0);
  React.useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const buttons = [...el.querySelectorAll<HTMLButtonElement>("button")];
    const stop = Math.min(current.current, buttons.length - 1);
    buttons.forEach((b, i) => (b.tabIndex = i === stop ? 0 : -1));
  });
  React.useEffect(() => {
    const el = row.current;
    if (!el) return;
    const onFocus = (event: FocusEvent) => {
      const buttons = [...el.querySelectorAll<HTMLButtonElement>("button")];
      const i = buttons.indexOf(event.target as HTMLButtonElement);
      if (i < 0) return;
      current.current = i;
      buttons.forEach((b, j) => (b.tabIndex = j === i ? 0 : -1));
    };
    el.addEventListener("focusin", onFocus);
    return () => el.removeEventListener("focusin", onFocus);
  }, [row]);
}
