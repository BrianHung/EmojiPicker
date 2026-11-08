import { afterEach } from "vitest";
import { cleanupRoots } from "./render";

// jsdom only: the server-rendering tests run in node
if (typeof window !== "undefined") {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  if (typeof CSS === "undefined" || !CSS.escape) Object.assign(globalThis, { CSS: { escape: (s: string) => s.replace(/[^\w-]/g, "\\$&") } });
  // jsdom has no canvas: native emoji support reads as unknown
  Object.assign(HTMLCanvasElement.prototype, { getContext: () => null });
  afterEach(() => {
    cleanupRoots();
    document.body.replaceChildren();
    localStorage.clear();
  });
}
