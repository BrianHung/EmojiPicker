// Virtualizes the List's collection inside the picker's Viewport with React Stately's
// virtualizer. React Aria's own <Virtualizer> scrolls the collection element itself;
// here the Viewport scrolls (it owns the scrollbar, its padding and styling) and the
// listbox is the tall list inside it. Headers stick with `position: sticky` on their
// wrapper, inside their section's box.
import * as React from "react";
import { flushSync } from "react-dom";
import type { Collection, Key, Node } from "@react-types/shared";
import { Rect, Size, useVirtualizerState, type LayoutInfo, type ReusableView, type VirtualizerState } from "react-stately/useVirtualizerState";
import type { EmojiGridLayout, EmojiGridLayoutOptions } from "./layout";

type View = ReusableView<Node<unknown>, React.ReactNode>;
type Options = {
  collection: Collection<Node<unknown>>;
  layout: EmojiGridLayout;
  /** The element for a section, title, cell or loader (a section renders its children with VirtualBranch). */
  renderNode: (node: Node<unknown>) => React.ReactNode;
  /** Kept rendered while out of view (the focused cell). */
  persistedKeys?: Set<Key> | null;
  layoutOptions: EmojiGridLayoutOptions;
  /** The element that scrolls (the Viewport), given the collection element. */
  scroller: (list: HTMLElement) => HTMLElement | null;
  /** Called with the virtualizer on each render (for navigation and jumps). */
  onState?: (state: VirtualizerState<Node<unknown>, React.ReactNode>) => void;
  /** Called once the rendered rows are in the DOM (after every render, scrolls included). */
  onRendered?: () => void;
};

const BranchContext = React.createContext<{ state: VirtualizerState<Node<unknown>, React.ReactNode>; dir: "ltr" | "rtl"; horizontal: boolean } | null>(null);

/** How far `list`'s start edge sits before `scroller`'s start edge, in layout px (a CSS transform on an ancestor is undone). */
function visibleOffset(scroller: HTMLElement, list: HTMLElement, horizontal: boolean, rtl: boolean) {
  const s = scroller.getBoundingClientRect();
  const l = list.getBoundingClientRect();
  if (!horizontal) return (s.top + scroller.clientTop * (s.height / scroller.offsetHeight || 1) - l.top) / (s.height / scroller.offsetHeight || 1);
  const scale = s.width / scroller.offsetWidth || 1;
  return rtl ? (l.right - (s.right - scroller.clientLeft * scale)) / scale : (s.left + scroller.clientLeft * scale - l.left) / scale;
}

/** The virtualized content of the collection element (its child: the listbox scrolls with the Viewport). */
export const VirtualCollection = React.memo(function VirtualCollection(options: Options) {
  const { collection, persistedKeys, layout, layoutOptions, scroller, renderNode } = options;
  const horizontal = layoutOptions.orientation === "horizontal";
  // The collection element is this content's parent (its ref isn't attached yet when our effects first run).
  const content = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useMemo(() => ({ get current() { return content.current?.parentElement ?? null; } }), []);
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
  const dirRef = React.useRef(dir);
  dirRef.current = dir;
  const state = useVirtualizerState<Node<unknown>, React.ReactNode, EmojiGridLayoutOptions>({
    allowsWindowScrolling: true,
    layout,
    collection,
    renderView: (_type, item) => (item ? renderNode(item) : null),
    onVisibleRectChange(rect) {
      const list = scrollRef.current;
      const el = list && scroller(list);
      if (!el || !list) return;
      // The list may start below the scroller's edge (its padding, a row above it): only its own offset moves.
      const current = Math.max(0, visibleOffset(el, list, horizontal, dir === "rtl"));
      const delta = (horizontal ? rect.x : rect.y) - current;
      if (!delta) return;
      if (horizontal) el.scrollLeft += delta * (dir === "rtl" ? -1 : 1);
      else el.scrollTop += delta;
    },
    persistedKeys,
    layoutOptions,
  });
  options.onState?.(state);
  const latest = React.useRef(state);
  latest.current = state;

  const sync = React.useCallback(
    (flush: boolean) => {
      const list = scrollRef.current;
      const el = list && scroller(list);
      if (!el || !list) return;
      const rtl = getComputedStyle(list).direction === "rtl";
      const offset = visibleOffset(el, list, horizontal, rtl);
      // Layout px, as the browser rounds them (unaffected by an ancestor's scale).
      const width = list.clientWidth;
      const size = horizontal ? new Size(el.clientWidth, list.clientHeight) : new Size(width, el.clientHeight);
      // What of the list is in the scroller's window.
      const start = Math.max(0, offset);
      const extent = Math.max(0, (horizontal ? el.clientWidth : el.clientHeight) + Math.min(0, offset));
      const rect = horizontal ? new Rect(start, 0, extent, list.clientHeight) : new Rect(0, start, width, extent);
      const { virtualizer, setSize, setVisibleRect } = latest.current;
      if (virtualizer.size.equals(size) && virtualizer.visibleRect.equals(rect) && (rtl ? "rtl" : "ltr") === dirRef.current) return;
      const apply = () => {
        setDir(rtl ? "rtl" : "ltr");
        if (!virtualizer.size.equals(size)) setSize(size);
        if (!virtualizer.visibleRect.equals(rect)) setVisibleRect(rect);
      };
      if (flush) flushSync(apply);
      else apply();
    },
    [scroller, scrollRef, horizontal],
  );

  React.useLayoutEffect(() => {
    const list = scrollRef.current;
    const el = list && scroller(list);
    if (!el || !list) return;
    sync(false);
    const onScroll = () => sync(true);
    el.addEventListener("scroll", onScroll, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => sync(false));
    observer?.observe(el);
    observer?.observe(list);
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [sync, scroller, scrollRef]);

  React.useLayoutEffect(() => options.onRendered?.());
  const size = state.contentSize;
  return (
    <div ref={content} role="presentation" style={{ position: "relative", width: horizontal ? size.width : undefined, height: size.height }}>
      <BranchContext.Provider value={{ state, dir, horizontal }}>{renderChildren(null, state.visibleViews, dir, horizontal)}</BranchContext.Provider>
    </div>
  );
});

/** A section's visible children. */
export function VirtualBranch({ parent }: { parent: Key }) {
  const { state, dir, horizontal } = React.useContext(BranchContext)!;
  const view = state.virtualizer.getVisibleView(parent);
  return view ? renderChildren(view, [...view.children], dir, horizontal) : null;
}

function renderChildren(parent: View | null, views: Iterable<View>, dir: "ltr" | "rtl", horizontal: boolean): React.ReactNode {
  return [...views].map((view) => (
    <div key={view.key} role="presentation" style={wrapperStyle(view.layoutInfo!, parent?.layoutInfo ?? null, dir, horizontal)}>
      {view.rendered}
    </div>
  ));
}

function wrapperStyle(info: LayoutInfo, parent: LayoutInfo | null, dir: "ltr" | "rtl", horizontal: boolean): React.CSSProperties {
  const x = info.rect.x - (parent?.rect.x ?? 0);
  const y = info.rect.y - (parent?.rect.y ?? 0);
  if (info.isSticky)
    return horizontal
      ? { position: "sticky", insetInlineStart: 0, width: "max-content", maxWidth: info.rect.width, height: info.rect.height, zIndex: info.zIndex || undefined }
      : { position: "sticky", top: 0, height: info.rect.height, zIndex: info.zIndex || undefined };
  return {
    position: "absolute",
    top: y,
    [dir === "rtl" ? "right" : "left"]: x,
    width: info.rect.width,
    height: info.rect.height,
    overflow: info.allowOverflow ? "visible" : "hidden",
    zIndex: info.zIndex || undefined,
  };
}
