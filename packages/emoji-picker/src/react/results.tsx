// Internal: search results. While a query is active the picker shows these instead
// of the engine's filtered list: ranked (one list, best first) or grouped (category
// sections, each in rank order), rendered with the same cell and header components.
import * as React from "react";
import * as Epr from "emoji-picker-react/primitives";
import { GROUPS, isUnified, unifiedToNative, type EmojiRecord } from "../core/dataset";
import { moveByRows, rowsPerPage, type Point } from "./grid-nav";
import { EmojiImage } from "./image";
import { ArtworkGlyph, findArtwork, useArtwork, useArtworkMap } from "./overrides";
import { useEmojiSearchState } from "./hooks";
import { mergeRefs, useKeyRegion, type PickerKeyboardEvent, type RegionResult } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { useEmojiContext } from "./provider";
import { SLOTS } from "./slots";
import { PickerDataContext } from "./strip-context";

export type SearchResultsMode = "ranked" | "grouped";

/** Logical keys a results renderer moves the highlight by (Left/Right already mirrored for right-to-left). */
export type NavKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "PageUp" | "PageDown" | "Home" | "End";

type ResultsState = {
  /** A query is active, so results replace the category list. */
  active: boolean;
  mode: SearchResultsMode;
  results: readonly EmojiRecord[];
  pending: boolean;
  /** Index into `results`; -1 when nothing is highlighted. */
  highlighted: number;
  setHighlighted: (index: number) => void;
  /** Hovered result with pointer "independent" (previewed, not highlighted); -1 when none. */
  hovered: number;
  setHovered: (index: number) => void;
  /** DOM id of a result's cell, for aria-activedescendant. */
  cellId: (index: number) => string;
  gridId: string;
  pick: (index: number) => void;
  /** Set by the mounted results renderer: where a key moves the highlight (null: stay). */
  move: React.MutableRefObject<((from: number, key: NavKey) => number | null) | null>;
  categoryName: (group: string) => string;
};

const ResultsContext = React.createContext<ResultsState | null>(null);
export const useResults = () => React.useContext(ResultsContext);

const NATIVE_FONT = '"Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", "Apple Color Emoji", "Twemoji Mozilla", "Noto Color Emoji", "EmojiOne Color", "Android Emoji"';

export function ResultsProvider({
  mode,
  limit,
  categoryNames,
  emojiVersion,
  onPick,
  children,
}: {
  mode: SearchResultsMode;
  limit: number;
  /** Leave out emoji newer than this emoji version. */
  emojiVersion?: number;
  categoryNames: Record<string, string>;
  onPick: (record: EmojiRecord) => void;
  children: React.ReactNode;
}) {
  const { search } = Epr.useSearchState();
  const state = useEmojiSearchState(search, { limit });
  const pending = state.pending;
  const results = React.useMemo(
    () => (emojiVersion == null ? state.results : state.results.filter((r) => r.imageUrl || r.version <= emojiVersion)),
    [state.results, emojiVersion],
  );
  const { store, labels } = useEmojiContext();
  const active = search.trim().length > 0;
  // The top result is highlighted as you type (Enter picks it), like Slack and Discord.
  // New results for the same query (an async engine settling, a rerank after a pick)
  // keep the highlighted emoji, so picking with the picker open doesn't move it.
  const [highlighted, setHighlightedIndex] = React.useState(0);
  const highlightedKey = React.useRef<{ search: string; unified?: string }>({ search: "" });
  const latestResults = React.useRef(results);
  latestResults.current = results;
  const setHighlighted = React.useCallback(
    (index: number) => {
      highlightedKey.current = { search, unified: latestResults.current[index]?.unified };
      setHighlightedIndex(index);
    },
    [search],
  );
  React.useEffect(() => {
    const previous = highlightedKey.current;
    const kept = previous.search === search && previous.unified ? results.findIndex((r) => r.unified === previous.unified) : -1;
    setHighlighted(Math.max(0, kept));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);
  const move = React.useRef<ResultsState["move"]["current"]>(null);
  const [hovered, setHovered] = React.useState(-1);
  const gridId = React.useId();

  const value = React.useMemo<ResultsState>(() => {
    const groupNames = store.groupNames();
    return {
      active,
      mode,
      results,
      pending,
      highlighted: results.length ? Math.min(highlighted, results.length - 1) : -1,
      setHighlighted,
      hovered: hovered < results.length ? hovered : -1,
      setHovered,
      cellId: (i) => `${gridId}-${i}`,
      gridId,
      pick: (i) => {
        const record = results[i];
        if (record) onPick(record);
      },
      move,
      categoryName: (group) => categoryNames[group] ?? (group === "custom" ? labels.custom : groupNames[GROUPS.indexOf(group as (typeof GROUPS)[number])] ?? group),
    };
  }, [active, mode, results, pending, highlighted, setHighlighted, hovered, gridId, onPick, categoryNames, store, labels]);
  // One polite announcement of the results shown, once they settle.
  const announcement = !active || pending ? "" : results.length ? `${results.length} ${results.length === 1 ? "result" : "results"}` : "No results";
  return (
    <ResultsContext.Provider value={value}>
      {children}
      <span role="status" aria-live="polite" aria-atomic="true" data-slot={SLOTS.searchStatus} style={VISUALLY_HIDDEN}>
        {announcement}
      </span>
    </ResultsContext.Provider>
  );
}

const VISUALLY_HIDDEN: React.CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 };

const NAV_KEYS: Partial<Record<KeyboardAction, NavKey>> = {
  "move-up": "ArrowUp",
  "move-down": "ArrowDown",
  "move-left": "ArrowLeft",
  "move-right": "ArrowRight",
  "page-up": "PageUp",
  "page-down": "PageDown",
  first: "Home",
  last: "End",
};

/**
 * Keys in the search input while results show: the highlight moves and focus stays
 * in the field (a combobox). Left and Right move it only with the caret at the end
 * of the text, so they still edit the query.
 */
export function useResultsKeyboard() {
  const state = useResults();
  const { focusModel } = React.useContext(PickerDataContext);
  return React.useCallback(
    (action: KeyboardAction | null, event: PickerKeyboardEvent): RegionResult => {
      if (!state?.active || !state.results.length || !action) return "pass";
      if (focusModel === "grid") {
        // Down, or Right at the end of the text, moves focus into the results.
        const input = event.target as HTMLInputElement;
        const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
        if (action !== "move-down" && !(atEnd && action === (getComputedStyle(input).direction === "rtl" ? "move-left" : "move-right"))) return "pass";
        const cell = document.getElementById(state.cellId(Math.max(0, state.highlighted)));
        if (!cell) return "pass";
        cell.focus({ preventScroll: true });
        return "handled";
      }
      if (action === "select") {
        if (state.highlighted < 0) return "pass";
        state.pick(state.highlighted);
        return "handled";
      }
      let key = NAV_KEYS[action];
      if (!key) return "pass";
      const input = event.target as HTMLInputElement;
      if (key === "ArrowLeft" || key === "ArrowRight") {
        const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
        if (!atEnd) return "pass";
        if (getComputedStyle(input).direction === "rtl") key = key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
        // At the first result, Left goes back to editing the text.
        if (key === "ArrowLeft" && state.highlighted <= 0) return "pass";
      }
      const next = state.move.current?.(Math.max(0, state.highlighted), key) ?? null;
      if (next != null) state.setHighlighted(next);
      return "handled";
    },
    [state, focusModel],
  );
}

type Cell = React.ComponentType<Epr.EmojiRenderProps>;
type Header = React.ComponentType<Epr.CategoryHeaderRenderProps>;

/**
 * One emoji in our grids (search results, the horizontal list): native text, or an
 * image for custom emoji and Twemoji. `active` (hovered or highlighted) plays an
 * animated custom emoji.
 */
export function Glyph({ record, unified, active = false }: { record: EmojiRecord; unified: string; active?: boolean }) {
  const { renderer, imageUrl } = useEmojiContext();
  const art = useArtwork(unified);
  if (art !== undefined) return <ArtworkGlyph art={art} alt={record.name} size="var(--emoji-image-size, var(--epr-emoji-size))" />;
  const src = record.imageUrl ?? (renderer === "twemoji" && isUnified(unified) ? imageUrl(unified) : undefined);
  if (src) return <EmojiImage src={src} alt={record.name} record={record} size="var(--emoji-image-size, var(--epr-emoji-size))" animate={active} fallback={record.imageUrl ? undefined : unifiedToNative(unified)} />;
  return (
    <span aria-hidden style={{ fontFamily: `var(--epr-emoji-font-family, ${NATIVE_FONT})`, fontSize: "var(--epr-emoji-size)", lineHeight: "100%", letterSpacing: 0 }}>
      {unifiedToNative(unified)}
    </span>
  );
}

const ROW: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(var(--emoji-results-columns, auto-fill), var(--epr-emoji-fullsize))",
  gridAutoRows: "var(--epr-emoji-fullsize)",
  justifyContent: "space-between",
  paddingInline: "var(--epr-horizontal-padding)",
  margin: 0,
  listStyle: "none",
};

/** The results grid, in place of the category list while searching. */
export const ResultsList = React.forwardRef<HTMLDivElement, { cell: Cell; header: Header; className?: string; style?: React.CSSProperties }>(function ResultsList({ cell: CellSlot, header: HeaderSlot, className, style }, ref) {
  const state = useResults()!;
  const { store } = useEmojiContext();
  const { focusModel, pointer } = React.useContext(PickerDataContext);
  const artwork = useArtworkMap();
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  // focusModel "grid": keys on a focused result move focus with the highlight; Up
  // from the top row goes back to the search field.
  const region = useKeyRegion((action, event) => {
    const cell = (event.target as Element).closest<HTMLElement>("[data-result]");
    if (!action || !cell || !gridRef.current?.contains(cell)) return "pass";
    if (action === "select") {
      cell.click();
      return "handled";
    }
    let key = NAV_KEYS[action];
    if (!key) return "pass";
    if ((key === "ArrowLeft" || key === "ArrowRight") && getComputedStyle(cell).direction === "rtl") key = key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    const next = state.move.current?.(Number(cell.dataset.result), key) ?? null;
    if (next != null) {
      state.setHighlighted(next);
      document.getElementById(state.cellId(next))?.focus({ preventScroll: true });
    } else if (key === "ArrowUp") {
      gridRef.current?.closest('[data-epr-part="root"]')?.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`)?.focus();
    }
    return "handled";
  });
  const setRef = React.useMemo(() => mergeRefs(gridRef, region, ref), [region, ref]);

  // Moves follow what's on screen (grouped results reorder them), read from the cells.
  React.useEffect(() => {
    state.move.current = (from, key) => moveInResults(gridRef.current, from, key);
    return () => {
      state.move.current = null;
    };
  }, [state.move]);
  // Keep the highlighted cell visible by scrolling the results' own scroller only;
  // scrollIntoView would also scroll the page to the picker.
  React.useEffect(() => {
    const cell = gridRef.current?.querySelector<HTMLElement>("[data-highlighted]");
    const scroller = cell?.closest<HTMLElement>('[data-slot="viewport"]');
    if (!cell || !scroller) return;
    const c = cell.getBoundingClientRect();
    const v = scroller.getBoundingClientRect();
    if (c.top < v.top) scroller.scrollTop -= v.top - c.top;
    else if (c.bottom > v.bottom) scroller.scrollTop += c.bottom - v.bottom;
  }, [state.highlighted]);

  const cellFor = (record: EmojiRecord, index: number) => {
    const unified = record.imageUrl ? record.unified : store.withSkinTone(record.unified);
    const highlighted = index === state.highlighted;
    return (
      <CellSlot
        key={record.unified}
        id={state.cellId(index)}
        type="button"
        role="gridcell"
        // "grid": the highlighted result is the tab stop. "input": none are; focus stays in the field.
        tabIndex={focusModel === "grid" && highlighted ? 0 : -1}
        aria-label={record.name}
        aria-selected={highlighted}
        data-epr-unified={unified}
        // Our own attribute, not the engine's data-epr-highlighted: the engine treats that mark as its highlight and clears it.
          data-highlighted={highlighted ? "" : undefined}
        emoji={{
          unified,
          names: [...record.shortcodes, record.name],
          emoji: record.imageUrl ? unified : unifiedToNative(unified),
          isCustom: Boolean(record.imageUrl),
          imageUrl: record.imageUrl,
          isActive: highlighted,
          hasVariations: record.tones.length > 0,
        } as Epr.EmojiRenderProps["emoji"]}
        data-result={index}
        data-overridden={artwork && findArtwork(artwork, unified) !== undefined ? "" : undefined}
        // A combobox's options don't take focus: keep it (and the caret) in the search field.
        onMouseDown={focusModel === "input" ? (e: React.MouseEvent) => e.preventDefault() : undefined}
        onClick={() => state.pick(index)}
        onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
          if (pointer === "independent") return state.hovered === index || state.setHovered(index);
          if (!highlighted) state.setHighlighted(index);
          // Focus follows the pointer once it's in the results (focusModel "grid").
          const active = document.activeElement;
          if (focusModel === "grid" && active !== e.currentTarget && active instanceof HTMLElement && active.dataset.result != null && gridRef.current?.contains(active)) e.currentTarget.focus({ preventScroll: true });
        }}
        onPointerLeave={pointer === "independent" ? () => state.setHovered(-1) : undefined}
        style={{ width: "var(--epr-emoji-fullsize)", height: "var(--epr-emoji-fullsize)", padding: 0 }}
      >
        <Glyph record={record} unified={unified} active={highlighted} />
      </CellSlot>
    );
  };

  let body: React.ReactNode;
  if (state.mode === "ranked") {
    body = (
      // No section headers above: inset the grid on every side.
      <div role="row" data-results-row="" style={{ ...ROW, paddingBlock: "var(--epr-horizontal-padding)" }}>
        {state.results.map(cellFor)}
      </div>
    );
  } else {
    const groups = new Map<string, number[]>();
    state.results.forEach((r, i) => {
      const g = groups.get(r.group) ?? [];
      g.push(i);
      groups.set(r.group, g);
    });
    const order = [...GROUPS, "custom"] as string[];
    body = [...groups.keys()]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map((group) => (
        <section key={group} data-slot={SLOTS.category}>
          <HeaderSlot
            category={{ id: group, name: state.categoryName(group) } as Epr.CategoryHeaderRenderProps["category"]}
            style={{ position: "sticky", top: 0, zIndex: 1, height: "var(--epr-category-label-height)" }}
          >
            {state.categoryName(group)}
          </HeaderSlot>
          <div role="row" data-results-row="" style={ROW}>
            {groups.get(group)!.map((i) => cellFor(state.results[i]!, i))}
          </div>
        </section>
      ));
  }

  return (
    <div ref={setRef} id={state.gridId} role="grid" aria-label="Search results" aria-busy={state.pending || undefined} data-slot={SLOTS.list} data-results={state.mode} className={className} style={style}>
      {body}
    </div>
  );
});

/** Where `key` moves the highlight in the vertical results grid, by the cells' positions. */
function moveInResults(grid: HTMLElement | null, from: number, key: NavKey): number | null {
  if (!grid) return null;
  const cells = [...grid.querySelectorAll<HTMLElement>("[data-result]")];
  const at = cells.findIndex((c) => Number(c.dataset.result) === from);
  if (at < 0) return cells.length ? Number(cells[0]!.dataset.result) : null;
  const resultAt = (i: number | null) => (i == null || !cells[i] ? null : Number(cells[i]!.dataset.result));
  switch (key) {
    case "Home":
      return resultAt(0);
    case "End":
      return resultAt(cells.length - 1);
    case "ArrowLeft":
      return resultAt(at > 0 ? at - 1 : null);
    case "ArrowRight":
      return resultAt(at < cells.length - 1 ? at + 1 : null);
  }
  const points: Point[] = cells.map((c) => {
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top };
  });
  const scroller = grid.closest<HTMLElement>(`[data-slot="${SLOTS.viewport}"]`);
  const header = grid.querySelector<HTMLElement>(`[data-slot="${SLOTS.categoryHeader}"]`);
  const page = rowsPerPage(scroller?.clientHeight ?? 0, cells[at]!.offsetHeight, header?.offsetHeight ?? 0);
  const rows = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : key === "PageDown" ? page : -page;
  return resultAt(moveByRows(points, at, rows));
}
