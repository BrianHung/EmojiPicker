import { SLOTS } from "../../internals/slots";
import { TABBABLE } from "../../utils/dom";

const LIST = `[data-slot="${SLOTS.root}"] [data-slot="${SLOTS.list}"]`;

// For a popover's initial focus: the field with autoFocus, else the list's tab stop, else the list, which passes focus to the tab stop once the cells render
export function emojiPickerInitialFocus(root: Element | null | undefined): HTMLElement | null {
  if (!root) return null;
  const target = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>(`${LIST} [data-slot="${SLOTS.listCell}"][tabindex="0"]`) ?? root.querySelector<HTMLElement>(LIST);
  if (target || root.matches(`[data-slot="${SLOTS.root}"]`)) return target;
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].find((el) => el.tabIndex >= 0) ?? null;
}
