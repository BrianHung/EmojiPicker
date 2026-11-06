// Not React Aria's ListBox: its collection renders a hidden React tree with a fiber per emoji per picker
import * as React from "react";
import { useLocale } from "react-aria/I18nProvider";
import type { VirtualizerState } from "react-stately/useVirtualizerState";
import type { EmojiSection } from "@brianhung/emoji-picker-core";
import { useGridController } from "../grid/use-grid-controller";
import { useGridSections } from "../grid/use-grid-sections";
import { usePicker, ViewportContext } from "../root/context";
import { mergePartProps, type PickerHandlers } from "../utils/events";
import { useLatest } from "../utils/latest";
import { renderElement, resolve, type Orientation, type PartProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { useStore } from "../utils/store";
import { useLayoutEffect } from "../utils/utils";
import { Cell, type CellProps } from "./cell";
import { isSection, type CollectionNode } from "./collection";
import { CellsContext, HorizontalContext, TemplateContext } from "./contexts";
import { EmptyOption, type EmptyState } from "./empty";
import { HorizontalLayout, VerticalLayout, type EmojiGridLayout, type EmojiGridLayoutOptions, type GridMetrics } from "./layout";
import { layoutUnits, PROBE, readProbe, sameMetrics } from "./measure";
import { gridKeyboardDelegate } from "./navigation";
import {
  defaultSection,
  Items,
  ItemView,
  partsOf,
  Section,
  SectionActions,
  SectionHeader,
  SectionTitle,
  SectionView,
  type ItemsProps,
  type SectionActionsProps,
  type SectionActionsState,
  type SectionProps,
  type SectionState,
  type SectionTitleProps,
} from "./section";
import { ActionsLayer, useActionsTab } from "./section-actions";
import type { CellState } from "./use-cell";
import { useListGeometry } from "./use-list-geometry";
import { Variations, type VariationsOptionProps, type VariationsOptionState, type VariationsProps, type VariationsState } from "./variations";
import { VirtualCollection } from "./virtualizer";

export type ListState = { orientation: Orientation; searching: boolean; empty: boolean };

export type ListProps = PickerHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "dangerouslySetInnerHTML" | "className" | "style">> &
  PartProps<ListState, HTMLDivElement> & {
    children?: (section: EmojiSection) => React.ReactNode;
    orientation?: Orientation;
    rows?: number;
    searchRows?: number;
    renderEmptyState?: (state: EmptyState) => React.ReactNode;
  };

export type { EmptyState };

const DEFAULT_ROWS = 5;
const HORIZONTAL: React.CSSProperties = { flex: "none", width: "max-content" };
const UNPADDED = { "--ep-glyph-pad": "0px" } as React.CSSProperties;
const COLUMNS: React.CSSProperties = { height: 0, width: "calc(var(--ep-columns) * var(--ep-cell) + 2 * var(--ep-pad))", maxWidth: "100%" };

const ListRoot = React.forwardRef<HTMLDivElement, ListProps>(function List({ children, orientation = "vertical", rows = DEFAULT_ROWS, searchRows, renderEmptyState, className, style, render, ...rest }, ref) {
  const picker = usePicker("EmojiPicker.List");
  const searching = useStore(picker.state, (s) => s.searching);
  const horizontal = orientation === "horizontal";
  const setViewportOrientation = React.useContext(ViewportContext);
  useLayoutEffect(() => setViewportOrientation?.(orientation), [setViewportOrientation, orientation]);

  const { sections, request, probeRoot } = useGridSections(horizontal);
  const layout = React.useMemo<EmojiGridLayout>(() => (horizontal ? new HorizontalLayout() : new VerticalLayout()), [horizontal]);
  const navigation = React.useMemo(() => gridKeyboardDelegate(() => layout), [layout]);
  const [metrics, setMetrics] = React.useState<GridMetrics>(layout.metrics);
  const probeRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const results = searching && !horizontal ? picker.searchResults : undefined;
  // Results and the strip size cells from the probe with unpadded glyphs; the category grid measures its rendered cells
  const unpadded = horizontal || results !== undefined;
  const layoutOptions = React.useMemo<EmojiGridLayoutOptions>(() => ({ metrics, columns: picker.columns, results, rows: searching ? (searchRows ?? rows) : rows }), [metrics, picker.columns, results, searching, searchRows, rows]);

  const rtl = useLatest(useLocale().direction === "rtl");
  const virtualizer = React.useRef<VirtualizerState<CollectionNode, React.ReactNode> | null>(null);
  // The Viewport's ref isn't attached yet when the list's first layout effects run
  const scroller = React.useCallback((list: HTMLElement | null = listRef.current) => list?.closest<HTMLElement>(`[data-slot="${SLOTS.viewport}"]`) ?? list?.parentElement ?? null, []);
  const { geometry, settled } = useListGeometry(layout, navigation, listRef, scroller, virtualizer, rtl);
  const grid = useGridController({ sections, geometry, orientation, listRef, ref, probeRoot, request, "aria-label": rest["aria-label"], "aria-labelledby": rest["aria-labelledby"] });
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
      picker.root.current?.style.setProperty("--emoji-picker-content-width", `${width}px`);
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
  const template = children ?? defaultSection;
  const actions = React.useMemo(() => !horizontal && !searching && sections.some((s) => s.header && partsOf(template(s)).actions), [horizontal, searching, sections, template]);
  const tab = useActionsTab(sections);
  const listState: ListState = { orientation, searching, empty: collection.size === 0 };

  return (
    <CellsContext.Provider value={cells}>
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
            listState,
          )}
          {grid.variations}
          {actions ? <ActionsLayer layout={layout} list={listRef} sections={sections} actions={tab.actions} /> : null}
        </TemplateContext.Provider>
      </HorizontalContext.Provider>
    </CellsContext.Provider>
  );
});

export const List = /* @__PURE__ */ Object.assign(ListRoot, { Section, SectionTitle, SectionActions, Items, Cell, Variations });

type VariationsRowProps = VariationsProps;
type VariationsRowState = VariationsState;
type VariationProps = VariationsOptionProps;
type VariationState = VariationsOptionState;
type EmptyOptionState = EmptyState;

export type { CellProps, CellState, ItemsProps, SectionActionsProps, SectionActionsState, SectionProps, SectionState, SectionTitleProps };

export declare namespace List {
  type Props = ListProps;
  type State = ListState;
  type EmptyState = EmptyOptionState;
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
