// Virtual focus as React Aria dispatches it: focus events on the option the field's
// aria-activedescendant names, which useAutocomplete listens for.

/** The option the focused element points at with aria-activedescendant, else the focused element. */
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
