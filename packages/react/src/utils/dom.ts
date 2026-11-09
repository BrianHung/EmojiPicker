import type * as React from "react";

// Only an option the field points at is virtually focused: the field itself keeps DOM focus and gets no synthetic blur
function virtuallyFocused(doc: Document): Element | null {
  const id = doc.activeElement?.getAttribute("aria-activedescendant");
  return id ? doc.getElementById(id) : null;
}

// The keyboard target isn't blurred: an editor's blur listener would close its menu
export function moveVirtualFocus(to: Element, owner?: Element | null) {
  const from = virtuallyFocused(to.ownerDocument);
  if (from === to) return;
  if (from && from !== owner) {
    from.dispatchEvent(new FocusEvent("blur", { relatedTarget: to }));
    from.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: to }));
  }
  to.dispatchEvent(new FocusEvent("focus", { relatedTarget: from }));
  to.dispatchEvent(new FocusEvent("focusin", { bubbles: true, relatedTarget: from }));
}

// From React Aria's isFocusable (Apache-2.0, see THIRD_PARTY_NOTICES.md)
export const TABBABLE = [
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "area[href]",
  "summary",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable^="false"])',
  "permission",
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(':not([hidden]):not([tabindex="-1"]),');

export function nextTabbable(after: Element): HTMLElement | null {
  for (const el of after.ownerDocument.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (after.contains(el) || el.tabIndex < 0 || !(after.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (el.getClientRects().length && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

export function scrollParent(el: Element | null | undefined): HTMLElement | null {
  let parent = el?.parentElement ?? null;
  while (parent && !/auto|scroll/.test(getComputedStyle(parent).overflowY)) parent = parent.parentElement;
  return parent;
}

// An element given directly or through a ref
export const isRefObject = <T>(value: T | React.RefObject<T> | null | undefined): value is React.RefObject<T> => typeof value === "object" && value !== null && "current" in value && !(value instanceof Element);

export const elementOf = <T extends Element>(value: T | React.RefObject<T | null> | null | undefined): T | null => (isRefObject(value) ? value.current : (value ?? null));
