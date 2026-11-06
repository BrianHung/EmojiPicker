// Not React Aria's ListBox: its collection renders a hidden React tree with a fiber per emoji per picker
import * as React from "react";
import type { Node as CollectionNode } from "@react-types/shared";
import { useLocale } from "react-aria/I18nProvider";
import { mergeRefs } from "react-aria/mergeRefs";
import { useListBoxSection } from "react-aria/useListBox";
import type { Rect, VirtualizerState } from "react-stately/useVirtualizerState";
import type { EmojiItem, EmojiSection } from "../state/sections";
import { usePicker, ViewportContext } from "../root/context";
import { useCell, type CellState, type Cells } from "./cell";
import { useGridController, useGridSections, type GridGeometry } from "./grid";
import { mergePartProps, type PickerHandlers } from "../utils/events";
import { HorizontalLayout, VerticalLayout, type EmojiGridLayout, type EmojiGridLayoutOptions, type GridMetrics } from "./layout";
import { EmojiGridNavigation } from "./navigation";
import { Variations, type VariationsOptionProps, type VariationsOptionState, type VariationsProps, type VariationsState } from "./variations";
import { flag, renderElement, resolve, type Orientation, type PartElementProps, type PartProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { nextTabbable, TABBABLE } from "../utils/utils";
import { useStoreSnapshot } from "../provider/provider";
import { shallowEqual, useStore } from "../utils/store";
import { VirtualBranch, VirtualCollection } from "./virtualizer";

export type ListState = { orientation: Orientation; searching: boolean; empty: boolean };

export type ListProps = PickerHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "dangerouslySetInnerHTML" | "className" | "style">> &
  PartProps<ListState, HTMLDivElement> & {
    children?: (section: EmojiSection) => React.ReactNode;
    orientation?: Orientation;
    rows?: number;
    searchRows?: number;
    renderEmptyState?: (state: EmptyState) => React.ReactNode;
  };

export type EmptyState = { status: "loading" | "error" | "empty"; query: string; error: Error | null; retry: () => void };

const CellsContext = React.createContext<Cells | null>(null);
const HorizontalContext = React.createContext(false);
const TemplateContext = React.createContext<(section: EmojiSection) => React.ReactNode>(() => null);

const PROBE: React.CSSProperties = {
  position: "absolute",
  visibility: "hidden",
  pointerEvents: "none",
  boxSizing: "content-box",
  top: 0,
  left: 0,
  width: "var(--emoji-cell-width, var(--ep-cell))",
  height: "var(--emoji-cell-height, var(--ep-cell))",
  paddingTop: "var(--ep-header)",
  paddingLeft: "var(--ep-pad)",
  paddingRight: "var(--emoji-section-gap, var(--ep-pad))",
  paddingBottom: "var(--emoji-section-min-width, 0px)",
  marginRight: "var(--emoji-list-padding-end, var(--ep-pad))",
};

const HORIZONTAL: React.CSSProperties = { flex: "none", width: "max-content" };
const UNPADDED = { "--ep-glyph-pad": "0px" } as React.CSSProperties;
const COLUMNS: React.CSSProperties = { height: 0, width: "calc(var(--ep-columns) * var(--ep-cell) + 2 * var(--ep-pad))", maxWidth: "100%" };

function layoutUnits(el: HTMLElement) {
  const zoom = (el as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom || 1;
  return (n: number) => (zoom === 1 ? Math.trunc(n * 64) / 64 : Math.trunc(n * zoom * 64) / 64 / zoom + 1e-6);
}

function readProbe(probe: HTMLElement): GridMetrics {
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  const unit = layoutUnits(probe);
  return {
    cellWidth: px(cs.width) || 40,
    cellHeight: unit(px(cs.height)) || 40,
    headerHeight: unit(px(cs.paddingTop)),
    padding: px(cs.paddingLeft),
    paddingEnd: px(cs.marginRight),
    sectionGap: px(cs.paddingRight),
    sectionMinWidth: px(cs.paddingBottom),
  };
}

const sameMetrics = (a: GridMetrics, b: GridMetrics) => (Object.keys(a) as (keyof GridMetrics)[]).every((k) => Math.abs(a[k] - b[k]) < 0.01);

const ListRoot = React.forwardRef<HTMLDivElement, ListProps>(function List({ children, orientation = "vertical", rows = 5, searchRows, onKeyDown, renderEmptyState, className, style, render, ...rest }, ref) {
  const picker = usePicker("EmojiPicker.List");
  const searching = useStore(picker.state, (s) => s.searching);
  const horizontal = orientation === "horizontal";
  const setViewportOrientation = React.useContext(ViewportContext);
  React.useLayoutEffect(() => setViewportOrientation?.(orientation), [setViewportOrientation, orientation]);

  const { sections, request, probeRoot } = useGridSections(horizontal);

  const layout = React.useMemo<EmojiGridLayout>(() => (horizontal ? new HorizontalLayout() : new VerticalLayout()), [horizontal]);
  const navigation = React.useMemo(() => new EmojiGridNavigation(() => layout), [layout]);
  const [metrics, setMetrics] = React.useState<GridMetrics>(layout.metrics);
  const probeRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const results = searching && !horizontal ? picker.searchResults : undefined;
  // Results and the strip size cells from the probe with unpadded glyphs; the category grid measures its rendered cells
  const unpadded = horizontal || results !== undefined;
  const layoutOptions = React.useMemo<EmojiGridLayoutOptions>(() => ({ metrics, columns: picker.columns, results, rows: searching ? (searchRows ?? rows) : rows }), [metrics, picker.columns, results, searching, searchRows, rows]);
  const measure = React.useCallback(() => {
    const probe = probeRef.current;
    const list = listRef.current;
    if (!probe || !list) return;
    const next = readProbe(probe);
    if (!unpadded) {
      const { elements, headers } = latest.current.cells;
      const cell = elements.values().next().value;
      const header = headers.values().next().value;
      const unit = layoutUnits(list);
      if (cell?.offsetHeight) {
        next.cellWidth = cell.offsetHeight;
        next.cellHeight = unit(cell.offsetHeight);
      }
      if (header) next.headerHeight = unit(header.offsetHeight);
    }
    setMetrics((m) => (sameMetrics(m, next) ? m : next));
  }, [unpadded]);
  React.useLayoutEffect(measure);

  const rtlRef = React.useRef(false);
  rtlRef.current = useLocale().direction === "rtl";
  const virtualizer = React.useRef<VirtualizerState<CollectionNode<unknown>, React.ReactNode> | null>(null);
  const jumping = React.useRef<Rect | null>(null);
  // The Viewport's ref isn't attached yet when the list's first layout effects run
  const scroller = React.useCallback((list: HTMLElement | null = listRef.current) => list?.closest<HTMLElement>(`[data-slot="${SLOTS.viewport}"]`) ?? list?.parentElement ?? null, []);
  const geometry = React.useMemo<GridGeometry>(() => {
    const visibleRect = () => virtualizer.current?.virtualizer.visibleRect ?? null;
    const { axis } = layout;
    const sign = () => (axis.horizontal && rtlRef.current ? -1 : 1);
    return {
      grid: () => layout.grid,
      navigation,
      layoutDelegate: layout,
      isVisible(key) {
        const rect = visibleRect();
        return Boolean(rect && layout.isVisible(key, rect));
      },
      firstVisible() {
        const rect = visibleRect();
        return (rect && layout.firstVisible(rect)) ?? navigation.getFirstKey();
      },
      reveal(key, from) {
        const el = scroller();
        const seen = visibleRect();
        const info = layout.getLayoutInfo(key);
        if (!el || !seen || !info) return;
        const s = sign();
        const a = from != null ? layout.getLayoutInfo(from)?.rect : null;
        const before = el[axis.scroll];
        if (a) el[axis.scroll] += (layout.start(info.rect) - layout.start(a)) * s;
        const shown = seen.copy();
        shown[axis.start] += (el[axis.scroll] - before) * s;
        const by = layout.revealBy(key, info.rect, shown);
        if (by != null) el[axis.scroll] += s * by;
      },
      viewport() {
        const el = scroller();
        return el ? el[axis.client] : 0;
      },
      jump(id, instant) {
        const el = scroller();
        const rect = visibleRect();
        const info = layout.getLayoutInfo(id);
        if (!el || !rect || !info) return false;
        jumping.current = info.rect;
        const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollBy({ [axis.by]: (layout.jumpTarget(info.rect, el[axis.client]) - layout.start(rect)) * sign(), behavior: instant || reduce ? "auto" : "smooth" });
        return true;
      },
      overlay(key) {
        const cell = layout.getLayoutInfo(key)?.rect;
        const list = listRef.current;
        if (!cell || !list) return { position: "absolute", visibility: "hidden" };
        const { cellWidth, cellHeight } = layout.metrics;
        const width = 6 * cellWidth;
        const left = Math.max(0, Math.min(cell.x + cell.width / 2 - width / 2, layout.getContentSize().width - width));
        const above = cell.y - cellHeight;
        const top = above >= (visibleRect()?.y ?? 0) ? above : cell.maxY;
        return { position: "absolute", top: list.offsetTop + top, insetInlineStart: list.offsetLeft + left };
      },
    };
  }, [layout, navigation, scroller]);

  const grid = useGridController({ sections, geometry, orientation, listRef, ref: ref as React.Ref<HTMLElement>, probeRoot, onKeyDown: onKeyDown as never, "aria-label": rest["aria-label"], "aria-labelledby": rest["aria-labelledby"] });
  const latest = React.useRef(grid);
  latest.current = grid;

  React.useLayoutEffect(() => latest.current.flushJump());

  const onState = React.useCallback((state: VirtualizerState<CollectionNode<unknown>, React.ReactNode>) => {
    virtualizer.current = state;
  }, []);
  const contentWidth = React.useRef(0);
  const onRendered = React.useCallback(() => {
    measure();
    latest.current.applyHighlight();
    const width = virtualizer.current?.virtualizer.size.width ?? 0;
    if (width !== contentWidth.current) {
      contentWidth.current = width;
      picker.root.current?.style.setProperty("--emoji-picker-content-width", `${width}px`);
    }
    const shown = virtualizer.current?.virtualizer.getVisibleLayoutInfos();
    if (shown && !horizontal) request([...shown.keys()].flatMap((key) => latest.current.collection.emoji(key)?.unified ?? []));
    const rect = virtualizer.current?.virtualizer.visibleRect;
    if (!rect) return;
    if (jumping.current) {
      const { size } = layout.axis;
      const max = layout.getContentSize()[size] - rect[size];
      if (Math.abs(layout.start(rect) - Math.max(0, Math.min(layout.jumpTarget(jumping.current, rect[size]), max))) > 1) return;
      jumping.current = null;
    }
    if (!searching) {
      const key = layout.activeSection(rect);
      picker.state.setActiveSection(key == null ? null : String(key));
    }
    latest.current.syncStop();
  }, [measure, layout, picker.state, picker.root, searching, horizontal, request]);

  const { collection, persisted } = grid;
  const renderNode = React.useCallback((node: CollectionNode<unknown>) => {
    if (node.type === "section") return <SectionView section={node.value as EmojiSection} />;
    if (node.type === "header") return <SectionHeader />;
    return <ItemView item={node as unknown as EmojiItem} />;
  }, []);
  const template = children ?? defaultSection;
  const actions = React.useMemo(() => !horizontal && !searching && sections.some((s) => s.header && partsOf(template(s)).actions), [horizontal, searching, sections, template]);
  const tab = useActionsTab(sections);

  return (
    <CellsContext.Provider value={grid.cells}>
      <HorizontalContext.Provider value={horizontal}>
        <TemplateContext.Provider value={template}>
          {renderElement(
            "div",
            {
              ...mergePartProps(rest, grid.gridProps, { onKeyDownCapture: actions ? tab.onKeyDownCapture : undefined }),
              ref: grid.gridProps.ref,
              className,
              style: (s: ListState) => ({ ...(horizontal ? HORIZONTAL : null), ...(unpadded ? UNPADDED : null), ...resolve(style, s) }),
              render,
              children: (
                <>
                  {picker.columns && !horizontal ? <div aria-hidden style={COLUMNS} /> : null}
                  <VirtualCollection collection={collection} layout={layout} layoutOptions={layoutOptions} scroller={scroller} renderNode={renderNode} persistedKeys={persisted} onState={onState} onRendered={onRendered} />
                  <div ref={probeRef} aria-hidden style={PROBE} />
                  {collection.size === 0 && renderEmptyState ? <EmptyOption render={renderEmptyState} /> : null}
                </>
              ),
            },
            { orientation, searching, empty: collection.size === 0 },
          )}
          {grid.variations}
          {actions ? <ActionsLayer layout={layout} list={listRef} sections={sections} actions={tab.actions} /> : null}
        </TemplateContext.Provider>
      </HorizontalContext.Provider>
    </CellsContext.Provider>
  );
});

export type SectionState = { section: EmojiSection; collapsed: boolean };

type SectionData = { section: EmojiSection; groupProps: React.HTMLAttributes<HTMLElement>; headingProps: React.HTMLAttributes<HTMLElement> };
const SectionContext = React.createContext<SectionData | null>(null);
type Parts = { title?: React.ReactElement; items?: React.ReactElement<ItemsProps>; actions?: React.ReactElement<SectionActionsProps> };
const PartsContext = React.createContext<Parts>({});
const ItemContext = React.createContext<EmojiItem | null>(null);

function useSection(part: string) {
  const data = React.useContext(SectionContext);
  if (!data) throw new Error(`EmojiPicker.List.${part} must be in a List.Section, inside EmojiPicker.List's children.`);
  return data;
}

function collectParts(children: React.ReactNode): Parts {
  const parts: Parts = {};
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SectionTitle) parts.title = child;
    else if (child.type === Items) parts.items = child as React.ReactElement<ItemsProps>;
    else if (child.type === SectionActions) parts.actions = child as React.ReactElement<SectionActionsProps>;
  });
  return parts;
}

const partsOf = (node: React.ReactNode) => (React.isValidElement<SectionProps>(node) && node.type === Section ? collectParts(node.props.children) : {});

const defaultSection = () => (
  <Section>
    <SectionTitle />
    <Items />
  </Section>
);

function SectionView({ section }: { section: EmojiSection }) {
  const template = React.useContext(TemplateContext);
  const { headingProps, groupProps } = useListBoxSection({ heading: section.header ? section.name : undefined, "aria-label": section.header ? undefined : section.name });
  return <SectionContext.Provider value={{ section, groupProps, headingProps }}>{template(section)}</SectionContext.Provider>;
}

export type SectionProps = Omit<PartElementProps<SectionState, HTMLElement>, "children"> & {
  children?: React.ReactNode;
};

const Section = React.forwardRef<HTMLElement, SectionProps>(function Section({ children, style, ...props }, ref) {
  const cells = React.useContext(CellsContext)!;
  const { section, groupProps } = useSection("Section");
  const parts = collectParts(children);
  return (
    <PartsContext.Provider value={parts}>
      {renderElement(
        "section",
        {
          ...groupProps,
          id: cells.sectionDomId(section.id),
          "data-slot": SLOTS.section,
          "data-category": section.category,
          "data-collapsed": flag(section.collapsed),
          ...props,
          style: (s: SectionState) => ({ height: "100%", ...resolve(style, s) }),
          ref,
          children: <VirtualBranch parent={section.id} />,
        },
        { section, collapsed: section.collapsed },
      )}
    </PartsContext.Provider>
  );
});

export type SectionTitleProps = PartElementProps<SectionState, HTMLElement>;

const SectionTitle = React.forwardRef<HTMLElement, SectionTitleProps>(function SectionTitle({ children, style, ...props }, ref) {
  const { section, headingProps } = useSection("SectionTitle");
  const { headers } = React.useContext(CellsContext)!;
  const element = React.useRef<HTMLElement | null>(null);
  const register = React.useCallback(
    (el: HTMLElement | null) => {
      if (element.current) headers.delete(element.current);
      element.current = el;
      if (el) headers.add(el);
    },
    [headers],
  );
  const refs = React.useMemo(() => mergeRefs<HTMLElement>(register, ref), [register, ref]);
  return renderElement(
    "header",
    {
      ...headingProps,
      className: props.className,
      "data-slot": SLOTS.sectionTitle,
      "data-collapsed": flag(section.collapsed),
      ...props,
      style: (s: SectionState) => ({ height: "var(--ep-header)", ...resolve(style, s) }),
      ref: refs,
      children: children ?? section.name,
    },
    { section, collapsed: section.collapsed },
  );
});

function SectionHeader() {
  const { title } = React.useContext(PartsContext);
  return title ?? <SectionTitle />;
}

export type ItemsProps = {
  children?: (emoji: EmojiItem) => React.ReactNode;
};

function Items(_: ItemsProps): null {
  return null;
}

function ItemView({ item }: { item: EmojiItem }) {
  const template = React.useContext(PartsContext).items?.props.children;
  return <ItemContext.Provider value={item}>{template ? template(item) : <Cell />}</ItemContext.Provider>;
}

export type CellProps = PartElementProps<CellState>;

const Cell = React.forwardRef<HTMLDivElement, CellProps>(function Cell({ className, style, render, children, ...props }, ref) {
  const cells = React.useContext(CellsContext);
  const item = React.useContext(ItemContext);
  if (!cells || !item) throw new Error("EmojiPicker.List.Cell must be inside List.Items.");
  const horizontal = React.useContext(HorizontalContext);
  const { cellProps, state } = useCell(cells, item);
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(cellProps.ref, ref), [cellProps.ref, ref]);
  return renderElement("div", { ...mergePartProps(props, cellProps), ref: refs, className, style: (s: CellState) => ({ ...(horizontal ? FILL : CELL), ...resolve(style, s) }), render, children: children ?? cellProps.children }, state);
});

const CELL: React.CSSProperties = { width: "var(--ep-cell)", height: "var(--ep-cell)", maxWidth: "var(--ep-cell)", maxHeight: "var(--ep-cell)" };
const FILL: React.CSSProperties = { width: "100%", height: "100%" };

const CONTENTS: React.CSSProperties = { display: "contents" };

function EmptyOption({ render }: { render: (state: EmptyState) => React.ReactNode }) {
  const { store, state: picker } = usePicker();
  const { query, pending } = useStore(picker, ({ query, pending }) => ({ query, pending }), shallowEqual);
  const status = useStoreSnapshot((s) => s.status());
  if (status === "ready" && pending) return null;
  const state: EmptyState = { status: status === "error" ? "error" : status === "ready" ? "empty" : "loading", query, error: store.error(), retry: () => void store.load().catch(() => {}) };
  return (
    <div role="option" style={CONTENTS}>
      {render(state)}
    </div>
  );
}

export type SectionActionsState = SectionState & {
  toggle: () => void;
  toggleProps: { "aria-expanded": boolean };
};

export type SectionActionsProps = PartElementProps<SectionActionsState>;

function SectionActions(_: SectionActionsProps): null {
  return null;
}

type ActionBlocks = { layer: React.RefObject<HTMLDivElement | null>; blocks: Map<string, HTMLElement> };

function useActionsTab(sections: readonly EmojiSection[]) {
  const [actions] = React.useState<ActionBlocks>(() => ({ layer: { current: null }, blocks: new Map() }));
  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const cell = e.target instanceof Element ? e.target.closest(`[data-slot="${SLOTS.emoji}"]`) : null;
    const at = sections.findIndex((s) => s.items.some((i) => i.id === cell?.getAttribute("data-key")));
    if (!cell || at < 0) return;
    // Header actions take any buttons and links, and the layer sits outside the grid's tab order: find the tabbables
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

function ActionsLayer({ layout, list, sections, actions }: { layout: EmojiGridLayout; list: React.RefObject<HTMLDivElement | null>; sections: readonly EmojiSection[]; actions: ActionBlocks }) {
  const cells = React.useContext(CellsContext)!;
  const template = React.useContext(TemplateContext);
  const [top, setTop] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = list.current;
    if (el && el.offsetTop !== top) setTop(el.offsetTop);
  });
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
                ref: mergeRefs<HTMLDivElement>((props as { ref?: React.Ref<HTMLDivElement> }).ref, block(s.id)),
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

export const List = /* @__PURE__ */ Object.assign(ListRoot, { Section, SectionTitle, SectionActions, Items, Cell, Variations });

type VariationsRowProps = VariationsProps;
type VariationsRowState = VariationsState;
type VariationProps = VariationsOptionProps;
type VariationState = VariationsOptionState;

export declare namespace List {
  type Props = ListProps;
  type State = ListState;
  namespace Section {
    type Props = SectionProps;
    type State = SectionState;
  }
  namespace SectionTitle {
    type Props = SectionTitleProps;
    type State = SectionState;
  }
  namespace Variations {
    type Props = VariationsRowProps;
    type State = VariationsRowState;
    namespace Option {
      type Props = VariationProps;
      type State = VariationState;
    }
  }
  namespace SectionActions {
    type Props = SectionActionsProps;
    type State = SectionActionsState;
  }
  namespace Items {
    type Props = ItemsProps;
  }
  namespace Cell {
    type Props = CellProps;
    type State = CellState;
  }
}
