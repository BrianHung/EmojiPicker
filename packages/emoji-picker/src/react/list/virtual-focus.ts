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
