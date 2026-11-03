// Internal: a tapback's reaction row on top of the engine's (a <ul> of buttons).
import * as React from "react";
import { withoutTone } from "../core/dataset";

/** The user's current reactions (base unified codes), for aria-pressed on their buttons. */
export const SelectedReactionsContext = React.createContext<ReadonlySet<string> | null>(null);

/** A code without skin-tone modifiers, lowercased: how reactions are compared. */
export const reactionKey = (unified: string) => withoutTone(unified.toLowerCase());

/** Whether a reaction button's emoji is one of the user's, in any skin tone. */
export const isPressed = (selected: ReadonlySet<string>, unified: string) => selected.has(reactionKey(unified));

/**
 * One tab stop for the row (roving tabindex): the last focused button, else the
 * first. Arrows, Home and End move along it, from the hovered button once focus
 * is in the row. The engine renders every button
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
    // Hover moves the keyboard position: once focus is in the row, it follows the pointer (without scrolling).
    const onHover = (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      const active = document.activeElement;
      if (button && button !== active && el.contains(button) && active instanceof HTMLButtonElement && el.contains(active)) button.focus({ preventScroll: true });
    };
    el.addEventListener("focusin", onFocus);
    el.addEventListener("mouseover", onHover);
    return () => {
      el.removeEventListener("focusin", onFocus);
      el.removeEventListener("mouseover", onHover);
    };
  }, [row]);
}

/**
 * "+" expands the row into the full picker; the engine then unmounts the button,
 * dropping focus. Focus goes to the picker's search field (else its first emoji)
 * once the panel shows.
 */
export function useExpandFocus(row: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const el = row.current;
    const root = el?.closest<HTMLElement>('[data-epr-part="root"]');
    if (!el || !root) return;
    let frame = 0;
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-epr-part="expand-reactions"]')) return;
      let tries = 20;
      const land = () => {
        const target = root.querySelector<HTMLElement>('[data-slot="search-input"]') ?? root.querySelector<HTMLElement>("button.epr-emoji, [data-slot=emoji]");
        const active = document.activeElement;
        // Only while focus is lost (or still on the button): not if the app moved it.
        if (active && active !== document.body && root.contains(active) && !active.closest('[data-epr-part="expand-reactions"]')) return;
        if (target && target.getClientRects().length) target.focus({ preventScroll: true });
        else if (--tries > 0) frame = requestAnimationFrame(land);
      };
      frame = requestAnimationFrame(land);
    };
    el.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("click", onClick);
    };
  }, [row]);
}
