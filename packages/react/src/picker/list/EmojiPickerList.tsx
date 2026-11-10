"use client";

// Not React Aria's ListBox: its collection renders a hidden React tree with a fiber per emoji per picker. CollectionBuilder builds only the section templates; the emoji come from data
import * as React from "react";
import { Collection } from "react-aria/Collection";
import { CollectionBuilder } from "react-aria/CollectionBuilder";
import { useLocale } from "react-aria/I18nProvider";
import type { VirtualizerState } from "react-stately/useVirtualizerState";
import type { EmojiSection } from "@emoji-components/core";
import { useGridController } from "./utils/useGridController";
import { useGridSections } from "./utils/useGridSections";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { EmojiPickerViewportContext } from "../viewport/EmojiPickerViewportContext";
import { mergePartProps } from "../../internals/mergePartProps";
import type { EmojiComponentsHandlers, EmojiComponentsPartProps } from "../../internals/types";
import type { EmojiPickerOrientation } from "../utils/types";
import { useLatest } from "../../utils/useLatest";
import { renderElement, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import { useStore } from "../../utils/useStore";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import { isSection, type CollectionNode } from "./utils/collection";
import { CellsContext, HorizontalContext, TemplatesContext } from "./EmojiPickerListContext";
import { EmptyOption } from "./utils/EmptyOption";
import { HorizontalLayout, VerticalLayout, type EmojiGridLayout, type EmojiGridLayoutOptions, type GridMetrics } from "./utils/layout";
import { layoutUnits, PROBE, readProbe, sameMetrics } from "./utils/measure";
import { gridKeyboardDelegate } from "./utils/navigation";
import { defaultSection, ItemView, SectionHeader, SectionView } from "./utils/sections";
import * as EmojiPickerRootCssVars from "../root/EmojiPickerRootCssVars";
import { ActionsLayer, hasActions, useActionsTab } from "./utils/ActionsLayer";
import { useListGeometry } from "./utils/useListGeometry";
import { VirtualCollection } from "./utils/VirtualCollection";

export type EmojiPickerListEmptyState = { status: "loading" | "error" | "empty"; query: string; error: Error | null; retry: () => void };

export type EmojiPickerListState = { orientation: EmojiPickerOrientation; searching: boolean; empty: boolean };

export type EmojiPickerListProps = EmojiComponentsHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "dangerouslySetInnerHTML" | "className" | "style">> &
  EmojiComponentsPartProps<EmojiPickerListState, HTMLDivElement> & {
    children?: (section: EmojiSection) => React.ReactNode;
    orientation?: EmojiPickerOrientation;
    rows?: number;
    renderEmptyState?: (state: EmojiPickerListEmptyState) => React.ReactNode;
  };

const DEFAULT_ROWS = 5;
const HORIZONTAL: React.CSSProperties = { flex: "none", width: "max-content" };
const UNPADDED = { "--ep-glyph-pad": "0px" } as React.CSSProperties;
const COLUMNS: React.CSSProperties = { height: 0, width: "calc(var(--ep-columns) * var(--ep-cell) + 2 * var(--ep-pad))", maxWidth: "100%" };

type Templates = React.ContextType<typeof TemplatesContext> & {};
type Sections = ReturnType<typeof useGridSections>;
type InnerProps = EmojiPickerListProps & { grid: Sections; templates: Templates };

// The outer part builds the section templates' collection; it re-renders only when the sections or the template change, not on a highlight move
export const EmojiPickerList = React.forwardRef<HTMLDivElement, EmojiPickerListProps>(function EmojiPickerList(props, ref) {
  const horizontal = props.orientation === "horizontal";
  const grid = useGridSections(horizontal);
  const template = props.children ?? defaultSection;
  // React Aria's CollectionBuilder builds a branch per section from its template, cached per section as React Aria's Collection caches items
  const content = React.useMemo(
    () => (
      <Collection items={grid.sections} dependencies={[template]}>
        {template as (section: EmojiSection) => React.ReactElement}
      </Collection>
    ),
    [grid.sections, template],
  );
  return <CollectionBuilder content={content}>{(templates: Templates) => <ListInner {...props} grid={grid} templates={templates} ref={ref} />}</CollectionBuilder>;
});

const ListInner = React.forwardRef<HTMLDivElement, InnerProps>(function ListInner({ children: _, grid: gridSections, templates, orientation = "vertical", rows = DEFAULT_ROWS, renderEmptyState, className, style, render, ...rest }, ref) {
  const picker = useEmojiPickerRootContext("EmojiPicker.List");
  const searching = useStore(picker.state, (s) => s.searching);
  const horizontal = orientation === "horizontal";
  const setViewportOrientation = React.useContext(EmojiPickerViewportContext);
  useLayoutEffect(() => setViewportOrientation?.(orientation), [setViewportOrientation, orientation]);

  const { sections, request } = gridSections;
  const layout = React.useMemo<EmojiGridLayout>(() => (horizontal ? new HorizontalLayout() : new VerticalLayout()), [horizontal]);
  const navigation = React.useMemo(() => gridKeyboardDelegate(() => layout), [layout]);
  const [metrics, setMetrics] = React.useState<GridMetrics>(layout.metrics);
  const probeRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const results = searching && !horizontal ? picker.searchResults : undefined;
  // Results and the strip size cells from the probe with unpadded glyphs; the category grid measures its rendered cells
  const unpadded = horizontal || results !== undefined;
  const layoutOptions = React.useMemo<EmojiGridLayoutOptions>(() => ({ metrics, columns: picker.columns, results, rows }), [metrics, picker.columns, results, rows]);

  const rtl = useLatest(useLocale().direction === "rtl");
  const virtualizer = React.useRef<VirtualizerState<CollectionNode, React.ReactNode> | null>(null);
  // The Viewport's ref isn't attached yet when the list's first layout effects run
  const scroller = React.useCallback((list: HTMLElement | null = listRef.current) => list?.closest<HTMLElement>(`[data-slot="${SLOTS.viewport}"]`) ?? list?.parentElement ?? null, []);
  const { geometry, settled } = useListGeometry(layout, navigation, listRef, scroller, rtl);
  const grid = useGridController({ sections, geometry, orientation, listRef, ref, request, "aria-label": rest["aria-label"], "aria-labelledby": rest["aria-labelledby"] });
  const { collection, persisted, cells } = grid;
  const { elements, headers } = cells;

  const measure = React.useCallback(() => {
    const probe = probeRef.current;
    const list = listRef.current;
    if (!probe || !list) return;
    const next = readProbe(probe);
    if (!unpadded) {
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
  }, [unpadded, elements, headers]);
  // The probe resizes with the variables that size cells and titles
  useLayoutEffect(() => {
    measure();
    const probe = probeRef.current;
    if (!probe || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(probe, { box: "border-box" });
    return () => observer.disconnect();
  }, [measure]);

  const onState = React.useCallback((state: VirtualizerState<CollectionNode, React.ReactNode>) => {
    virtualizer.current = state;
  }, []);
  const contentWidth = React.useRef(0);
  const latestGrid = useLatest(grid);
  const onRendered = React.useCallback(() => {
    measure();
    const state = virtualizer.current?.virtualizer;
    const width = state?.size.width ?? 0;
    if (width !== contentWidth.current) {
      contentWidth.current = width;
      picker.root.current?.style.setProperty(EmojiPickerRootCssVars.contentWidth, `${width}px`);
    }
    const shown = horizontal || !state ? [] : [...state.getVisibleLayoutInfos().keys()].flatMap((key) => latestGrid.current.collection.emoji(key)?.unified ?? []);
    const rect = state?.visibleRect;
    const key = rect ? layout.activeSection(rect) : null;
    latestGrid.current.afterRender({ unifieds: shown, section: key == null ? null : String(key), settled: Boolean(rect && settled(rect)) });
  }, [measure, layout, picker.root, horizontal, settled, latestGrid]);

  // React Aria's virtualizer keeps the first renderView it gets, so this reads only the node
  const renderNode = React.useCallback((node: CollectionNode) => {
    if (node.type === "header") return <SectionHeader />;
    const { value } = node;
    if (isSection(value)) return <SectionView section={value} />;
    return value ? <ItemView item={value} /> : null;
  }, []);
  const tab = useActionsTab(sections);
  const listState: EmojiPickerListState = { orientation, searching, empty: collection.size === 0 };

  const actions = !horizontal && !searching && hasActions(templates, sections);
  // biome-ignore lint/correctness/useExhaustiveDependencies: CollectionBuilder's first render has no parts yet; the cells measure again once they render from the built collection
  useLayoutEffect(() => measure(), [templates, measure]);
  return (
    <CellsContext.Provider value={cells}>
      <HorizontalContext.Provider value={horizontal}>
        <TemplatesContext.Provider value={templates}>
          {renderElement(
            "div",
            {
              ...mergePartProps(rest, grid.gridProps, { onKeyDownCapture: actions ? tab.onKeyDownCapture : undefined }),
              ref: grid.gridProps.ref,
              className,
              style: (s: EmojiPickerListState) => ({ ...(horizontal ? HORIZONTAL : null), ...(unpadded ? UNPADDED : null), ...resolve(style, s) }),
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
            listState,
          )}
          {grid.variations}
          {actions ? <ActionsLayer layout={layout} list={listRef} sections={sections} actions={tab.actions} /> : null}
        </TemplatesContext.Provider>
      </HorizontalContext.Provider>
    </CellsContext.Provider>
  );
});

export declare namespace EmojiPickerList {
  type Props = EmojiPickerListProps;
  type State = EmojiPickerListState;
  type EmptyState = EmojiPickerListEmptyState;
}
