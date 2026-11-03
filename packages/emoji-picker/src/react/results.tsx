// Internal: search results. While a query is active the picker shows these instead
// of the engine's filtered list: ranked (one list, best first) or grouped (category
// sections, each in rank order), rendered with the same cell and header components.
import * as React from "react";
import * as Epr from "emoji-picker-react/primitives";
import { GROUPS, isUnified, unifiedToNative, type EmojiRecord } from "../core/dataset";
import { useEmojiSearchState } from "./hooks";
import { useEmojiContext } from "./provider";
import { SLOTS } from "./slots";

export type SearchResultsMode = "ranked" | "grouped";

type ResultsState = {
  /** A query is active, so results replace the category list. */
  active: boolean;
  mode: SearchResultsMode;
  results: readonly EmojiRecord[];
  pending: boolean;
  /** Index into `results`; -1 when nothing is highlighted. */
  highlighted: number;
  setHighlighted: (index: number) => void;
  pick: (index: number) => void;
  columns: React.MutableRefObject<number>;
  /** Set by a horizontal List: where an arrow key moves the highlight (null: stay). */
  move: React.MutableRefObject<((from: number, key: string) => number | null) | null>;
  categoryName: (group: string) => string;
};

const ResultsContext = React.createContext<ResultsState | null>(null);
export const useResults = () => React.useContext(ResultsContext);

const NATIVE_FONT = '"Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", "Apple Color Emoji", "Twemoji Mozilla", "Noto Color Emoji", "EmojiOne Color", "Android Emoji"';

export function ResultsProvider({
  mode,
  limit,
  columns,
  categoryNames,
  emojiVersion,
  onPick,
  children,
}: {
  mode: SearchResultsMode;
  limit: number;
  columns?: number;
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
  const [highlighted, setHighlighted] = React.useState(0);
  React.useEffect(() => setHighlighted(0), [results]);
  const measured = React.useRef(columns ?? 1);
  const move = React.useRef<ResultsState["move"]["current"]>(null);
  if (columns) measured.current = columns;

  const value = React.useMemo<ResultsState>(() => {
    const groupNames = store.groupNames();
    return {
      active,
      mode,
      results,
      pending,
      highlighted: results.length ? Math.min(highlighted, results.length - 1) : -1,
      setHighlighted,
      pick: (i) => {
        const record = results[i];
        if (record) onPick(record);
      },
      columns: measured,
      move,
      categoryName: (group) => categoryNames[group] ?? (group === "custom" ? labels.custom : groupNames[GROUPS.indexOf(group as (typeof GROUPS)[number])] ?? group),
    };
  }, [active, mode, results, pending, highlighted, onPick, categoryNames, store, labels]);
  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>;
}

/** Keyboard handling for the search input while results are showing. */
export function useResultsKeyboard() {
  const state = useResults();
  return React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!state?.active || !state.results.length) return;
      const input = e.currentTarget;
      const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
      if (state.move.current) {
        const sideways = e.key === "ArrowLeft" || e.key === "ArrowRight";
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && (!sideways || atEnd)) {
          e.preventDefault();
          e.stopPropagation();
          const next = state.move.current(Math.max(0, state.highlighted), e.key);
          if (next != null) state.setHighlighted(next);
          return;
        }
      }
      const cols = Math.max(1, state.columns.current);
      const move = { ArrowDown: cols, ArrowUp: -cols, ArrowRight: atEnd ? 1 : 0, ArrowLeft: atEnd && state.highlighted > 0 ? -1 : 0 }[e.key];
      if (move) {
        e.preventDefault();
        e.stopPropagation();
        state.setHighlighted(Math.max(0, Math.min(state.results.length - 1, state.highlighted + move)));
      } else if (e.key === "Enter" && state.highlighted >= 0) {
        e.preventDefault();
        e.stopPropagation();
        state.pick(state.highlighted);
      }
    },
    [state],
  );
}

type Cell = React.ComponentType<Epr.EmojiRenderProps>;
type Header = React.ComponentType<Epr.CategoryHeaderRenderProps>;

export function Glyph({ record, unified }: { record: EmojiRecord; unified: string }) {
  const { renderer, imageUrl } = useEmojiContext();
  const src = record.imageUrl ?? (renderer === "twemoji" && isUnified(unified) ? imageUrl(unified) : undefined);
  if (src) {
    const size = "var(--emoji-image-size, var(--epr-emoji-size))";
    return <img src={src} alt="" draggable={false} style={{ width: size, height: size }} />;
  }
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
export function ResultsList({ cell: CellSlot, header: HeaderSlot, className, style }: { cell: Cell; header: Header; className?: string; style?: React.CSSProperties }) {
  const state = useResults()!;
  const { store } = useEmojiContext();
  const gridRef = React.useRef<HTMLDivElement | null>(null);

  // Columns for Up/Down: the Root's `columns`, else whatever the grid fits.
  React.useLayoutEffect(() => {
    const grid = gridRef.current?.querySelector<HTMLElement>("[data-results-row]");
    if (grid) state.columns.current = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
  });
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
        type="button"
        role="gridcell"
        tabIndex={-1}
        aria-label={record.name}
        aria-selected={highlighted}
        data-epr-unified={unified}
        data-epr-highlighted={highlighted ? "" : undefined}
        emoji={{
          unified,
          names: [...record.shortcodes, record.name],
          emoji: record.imageUrl ? unified : unifiedToNative(unified),
          isCustom: Boolean(record.imageUrl),
          imageUrl: record.imageUrl,
          isActive: highlighted,
          hasVariations: record.tones.length > 0,
        } as Epr.EmojiRenderProps["emoji"]}
        onClick={() => state.pick(index)}
        onPointerMove={() => highlighted || state.setHighlighted(index)}
        style={{ width: "var(--epr-emoji-fullsize)", height: "var(--epr-emoji-fullsize)", padding: 0 }}
      >
        <Glyph record={record} unified={unified} />
      </CellSlot>
    );
  };

  let body: React.ReactNode;
  if (state.mode === "ranked") {
    body = (
      <div role="row" data-results-row="" style={ROW}>
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
    <div ref={gridRef} role="grid" aria-label="Search results" aria-busy={state.pending || undefined} data-slot={SLOTS.list} data-results={state.mode} className={className} style={style}>
      {body}
    </div>
  );
}
