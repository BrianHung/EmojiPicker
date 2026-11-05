export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

function virtuallyFocused(doc: Document): Element | null {
  const active = doc.activeElement;
  const id = active?.getAttribute("aria-activedescendant");
  return (id && doc.getElementById(id)) || active;
}

export function moveVirtualFocus(to: Element) {
  const from = virtuallyFocused(to.ownerDocument);
  if (from === to) return;
  if (from) {
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
