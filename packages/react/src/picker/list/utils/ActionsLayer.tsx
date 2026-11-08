"use client";

import * as React from "react";
import type { Collection, Node } from "@react-types/shared";
import type { EmojiSection } from "@brianhung/emoji-picker-core";
import { SLOTS } from "../../../internals/slots";
import { hasModifier } from "../../../internals/usePickerKeyDown";
import { nextTabbable, TABBABLE } from "../../../utils/dom";
import { useLayoutEffect } from "../../../utils/useLayoutEffect";
import { partsOf } from "../../list-section/EmojiPickerListSectionContext";
import { EmojiPickerListSectionActionsContext } from "../../list-section-actions/EmojiPickerListSectionActionsContext";
import { TemplatesContext, useCells } from "../EmojiPickerListContext";
import type { EmojiGridLayout } from "./layout";

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

export const hasActions = (templates: Collection<Node<unknown>> | null, sections: readonly EmojiSection[]) => sections.some((s) => s.header && partsOf(templates, s.id).actions);

// Over the list, one block per section with actions, each pinned with its sticky title
export function ActionsLayer({ layout, list, sections, actions }: { layout: EmojiGridLayout; list: React.RefObject<HTMLDivElement | null>; sections: readonly EmojiSection[]; actions: ActionBlocks }) {
  const cells = useCells("SectionActions");
  const templates = React.useContext(TemplatesContext);
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
        const node = info && s.header ? partsOf(templates, s.id).actions : undefined;
        if (!info || !node?.render) return null;
        const place = { section: s, top: info.rect.y, height: info.rect.height, headerHeight: layout.metrics.headerHeight, toggle: () => cells.toggle(s.id), block: block(s.id) };
        return (
          <EmojiPickerListSectionActionsContext.Provider key={s.id} value={place}>
            {node.render(node)}
          </EmojiPickerListSectionActionsContext.Provider>
        );
      })}
    </div>
  );
}
