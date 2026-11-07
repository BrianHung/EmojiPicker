"use client";

import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import type { EmojiSection } from "@brianhung/emoji-picker-core";
import { hasModifier } from "../utils/keyboard";
import { elementRef, flag, renderElement, resolve } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { nextTabbable, TABBABLE, useLayoutEffect } from "../utils/utils";
import { TemplateContext, useCells } from "./contexts";
import type { EmojiGridLayout } from "./layout";
import { partsOf, type SectionActionsState } from "./section";

export interface ActionBlocks {
  layer: React.RefObject<HTMLDivElement | null>;
  blocks: Map<string, HTMLElement>;
}

// Tab from a cell goes to the next section's header actions, which sit outside the grid's tab order
export function useActionsTab(sections: readonly EmojiSection[]) {
  const [actions] = React.useState<ActionBlocks>(() => ({ layer: { current: null }, blocks: new Map() }));
  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || e.defaultPrevented || hasModifier(e)) return;
    const cell = e.target instanceof Element ? e.target.closest(`[data-slot="${SLOTS.emoji}"]`) : null;
    const at = sections.findIndex((s) => s.items.some((i) => i.id === cell?.getAttribute("data-key")));
    if (!cell || at < 0) return;
    // Header actions take any buttons and links: find the tabbables
    const tabbable = (i: number) => actions.blocks.get(sections[i]!.id)?.querySelector<HTMLElement>(TABBABLE) ?? null;
    const before = sections.slice(0, at + 1).map((_, i) => at - i);
    const after = sections.slice(at + 1).map((_, i) => at + 1 + i);
    const target = (e.shiftKey ? before : after).reduce<HTMLElement | null>((found, i) => found ?? tabbable(i), null) ?? (!e.shiftKey && actions.layer.current ? nextTabbable(actions.layer.current) : null);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    target.focus();
  };
  return { actions, onKeyDownCapture };
}

// Over the list, one block per section with actions, each pinned with its sticky title
export function ActionsLayer({ layout, list, sections, actions }: { layout: EmojiGridLayout; list: React.RefObject<HTMLDivElement | null>; sections: readonly EmojiSection[]; actions: ActionBlocks }) {
  const cells = useCells("SectionActions");
  const template = React.useContext(TemplateContext);
  const [top, setTop] = React.useState(0);
  // The list moves down when anything above it resizes
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = () => setTop(el.offsetTop);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    for (let above = el.previousElementSibling; above; above = above.previousElementSibling) observer.observe(above);
    return () => observer.disconnect();
  }, [list]);
  const block = (id: string) => (el: HTMLElement | null) => void (el ? actions.blocks.set(id, el) : actions.blocks.delete(id));
  return (
    <div ref={actions.layer} role="presentation" style={{ position: "absolute", top, insetInlineStart: 0, width: "100%", height: layout.getContentSize().height, pointerEvents: "none" }}>
      {sections.map((s) => {
        const info = layout.getLayoutInfo(s.id);
        const part = s.header ? partsOf(template(s)).actions : undefined;
        if (!info || !part) return null;
        const { style, children, ...props } = part.props;
        const state: SectionActionsState = { section: s, collapsed: s.collapsed, toggle: () => cells.toggle(s.id), toggleProps: { "aria-expanded": !s.collapsed } };
        return (
          <div key={s.id} style={{ position: "absolute", top: info.rect.y, insetInlineStart: 0, width: "100%", height: info.rect.height }}>
            {renderElement(
              "div",
              {
                ...props,
                ref: mergeRefs<HTMLDivElement>(elementRef<HTMLDivElement>(part), block(s.id)),
                "data-slot": SLOTS.sectionActions,
                "data-section": s.id,
                "data-collapsed": flag(s.collapsed),
                style: (st: SectionActionsState) => ({ position: "sticky", top: "var(--ep-sticky-offset, 0px)", height: layout.metrics.headerHeight, zIndex: 3, pointerEvents: "auto", ...resolve(style, st) }),
                children,
              },
              state,
            )}
          </div>
        );
      })}
    </div>
  );
}
