import * as React from "react";
import { createRoot, type Root } from "react-dom/client";

const roots = new Set<Root>();

// A React root unmounted after each test
export function createTestRoot(container: Element = document.body.appendChild(document.createElement("div"))): Root {
  const root = createRoot(container);
  roots.add(root);
  return root;
}

// For a root the test creates itself, such as a hydrated one
export const trackRoot = (root: Root): Root => (roots.add(root), root);

export function render(node: React.ReactNode): HTMLElement {
  const host = document.body.appendChild(document.createElement("div"));
  const root = createTestRoot(host);
  React.act(() => root.render(node));
  return host;
}

export function cleanupRoots() {
  for (const root of roots) React.act(() => root.unmount());
  roots.clear();
}
