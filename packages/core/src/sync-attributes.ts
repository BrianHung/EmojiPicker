import type { Subscribe } from "./reactive";

export type AriaAttributes = Readonly<Record<string, string | number | boolean | undefined>>;

// Writes attributes onto an element the app owns while read() returns them, and puts back what was there before
export function syncAriaAttributes(el: Element, read: () => AriaAttributes | null, subscribe: Subscribe): () => void {
  let saved: Map<string, string | null> | null = null;
  const restore = () => {
    if (!saved) return;
    for (const [name, value] of saved) {
      if (value == null) el.removeAttribute(name);
      else el.setAttribute(name, value);
    }
    saved = null;
  };
  const sync = () => {
    const attributes = read();
    if (!attributes) return restore();
    const before = (saved ??= new Map());
    for (const [name, value] of Object.entries(attributes)) {
      if (!before.has(name)) before.set(name, el.getAttribute(name));
      if (value === undefined) el.removeAttribute(name);
      else el.setAttribute(name, String(value));
    }
  };
  sync();
  const off = subscribe(sync);
  return () => {
    off();
    restore();
  };
}
