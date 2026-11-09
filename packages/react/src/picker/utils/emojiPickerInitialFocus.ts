import { SLOTS } from "../../internals/slots";
import { TABBABLE } from "../../utils/dom";

// For popovers this package doesn't render, so all it has is their content element
export function emojiPickerInitialFocus(root: Element | null | undefined): HTMLElement | null {
  if (!root) return null;
  const target = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"] [data-slot="${SLOTS.listCell}"][tabindex="0"]`);
  if (target) return target;
  if (root.querySelector(`[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"]`) || root.matches(`[data-slot="${SLOTS.root}"]`)) return null;
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].find((el) => el.tabIndex >= 0) ?? null;
}
