// Internal: the engine's list while focus stays in the search field (focusModel
// "input"). The engine moves a DOM-marked highlight (`data-epr-highlighted`) from
// whichever cell carries it; this adds what it lacks (pages, first/last, hover)
// by moving that mark, and mirrors it to our public `data-highlighted`.
import * as React from "react";
import { rowsPerPage } from "./grid-nav";
import { resendKey } from "./keyboard";
import type { FocusModel, PointerModel } from "./strip-context";

// The engine's markup (emoji-picker-react v5). Read here only, never styled.
export const ENGINE_CELL = "button.epr-emoji";
const VISIBLE_CELL = `${ENGINE_CELL}.epr-visible:not(.epr-hidden)`;
const SCROLLER = ".epr-body";
const CATEGORY = ".epr-emoji-category";
const CONTENT = '[data-epr-part="category-content"]';
const MARK = "data-epr-highlighted";

let ids = 0;
/** Fields whose aria-activedescendant was just given up for an Escape. */
const releasing = new WeakSet<HTMLInputElement>();

/** The highlighted cell under `scroller`, if any. */
const engineHighlighted = (scroller: Element | null) => scroller?.querySelector<HTMLElement>(`[${MARK}]`) ?? null;

/** Scrolls only the picker's own scroller so `cell` is in view (scrollIntoView would also scroll the page). */
function reveal(scroller: HTMLElement, cell: HTMLElement) {
  const c = cell.getBoundingClientRect();
  const v = scroller.getBoundingClientRect();
  const header = cell.closest(CATEGORY)?.querySelector<HTMLElement>('[data-slot="category-header"]')?.offsetHeight ?? 0;
  if (c.top < v.top + header) scroller.scrollTop -= v.top + header - c.top;
  else if (c.bottom > v.bottom) scroller.scrollTop += c.bottom - v.bottom;
}

/**
 * Moves the engine's highlight to `cell`, as its own highlighter does: the mark,
 * the input's aria-activedescendant, and the preview (footer). The engine's next
 * arrow and Enter start from here.
 */
function highlightEngineCell(input: HTMLInputElement, cell: HTMLElement, { scroll = true } = {}) {
  const scroller = cell.closest<HTMLElement>(SCROLLER);
  engineHighlighted(scroller)?.removeAttribute(MARK);
  cell.setAttribute(MARK, "");
  if (!cell.id) cell.id = `emoji-cell-${++ids}`;
  input.setAttribute("aria-activedescendant", cell.id);
  if (scroll && scroller) reveal(scroller, cell);
  // The engine previews the emoji a focus event lands on (it listens in capture);
  // a dispatched one doesn't move focus.
  cell.dispatchEvent(new FocusEvent("focus"));
}

/** Rows between `cell` and the top of the list, counting every section above. */
function rowsAbove(cell: HTMLElement): number {
  const category = cell.closest(CATEGORY);
  const content = category?.querySelector<HTMLElement>(CONTENT);
  if (!category || !content) return 0;
  const perRow = Number(content.dataset.eprEmojisPerRow) || 1;
  let rows = Math.floor(Number(cell.dataset.eprIndex) / perRow);
  for (let c = category.previousElementSibling; c; c = c.previousElementSibling) {
    const count = Number(c.querySelector<HTMLElement>(CONTENT)?.dataset.eprEmojiCount ?? 0);
    rows += Math.ceil(count / perRow);
  }
  return rows;
}

/** First or last emoji in the list: scrolls there, waits for the row to render, then `land` on it. */
function edgeCell(scroller: HTMLElement, edge: "first" | "last", land: (cell: HTMLElement) => void) {
  const contents = [...scroller.querySelectorAll<HTMLElement>(CONTENT)].filter((c) => Number(c.dataset.eprEmojiCount) > 0);
  const content = edge === "first" ? contents[0] : contents[contents.length - 1];
  if (!content) return;
  const index = edge === "first" ? 0 : Number(content.dataset.eprEmojiCount) - 1;
  scroller.scrollTop = edge === "first" ? 0 : scroller.scrollHeight;
  let frames = 30;
  const attempt = () => {
    const cell = content.querySelector<HTMLElement>(`${ENGINE_CELL}[data-epr-index="${index}"]`);
    if (cell) land(cell);
    else if (--frames > 0) requestAnimationFrame(attempt);
  };
  attempt();
}

export function focusEngineEdge(scroller: HTMLElement, edge: "first" | "last") {
  edgeCell(scroller, edge, (cell) => cell.focus({ preventScroll: true }));
}

/**
 * Pages and first/last from the search field, moving the highlight. A page is the
 * engine's own Down/Up repeated (it chains them), stopped at the first row so
 * PageUp doesn't end the highlight.
 */
export function moveEngineHighlight(input: HTMLInputElement, scroller: HTMLElement, action: "page-up" | "page-down" | "first" | "last"): boolean {
  if (action === "first" || action === "last") {
    edgeCell(scroller, action, (cell) => highlightEngineCell(input, cell));
    return true;
  }
  const current = engineHighlighted(scroller);
  const sample = current ?? scroller.querySelector<HTMLElement>(VISIBLE_CELL);
  if (!sample) return false;
  const header = sample.closest(CATEGORY)?.querySelector<HTMLElement>('[data-slot="category-header"]')?.offsetHeight ?? 0;
  let rows = rowsPerPage(scroller.clientHeight, sample.offsetHeight, header);
  if (action === "page-up") rows = Math.min(rows, current ? rowsAbove(current) : 0);
  for (let i = 0; i < rows; i++) resendKey(input, action === "page-down" ? "ArrowDown" : "ArrowUp");
  return true;
}

/** Copies the engine's highlight mark to `data-highlighted` (the attribute consumers style), anywhere under `root`. */
export function useHighlightMirror(root: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const el = root.current;
    if (!el || typeof MutationObserver === "undefined") return;
    const sync = (cell: Element) => cell.toggleAttribute("data-highlighted", cell.hasAttribute(MARK));
    el.querySelectorAll(`[${MARK}]`).forEach(sync);
    const observer = new MutationObserver((records) => {
      for (const r of records) if (r.target instanceof Element) sync(r.target);
    });
    observer.observe(el, { subtree: true, attributes: true, attributeFilter: [MARK] });
    return () => observer.disconnect();
  }, [root]);
}

/**
 * Hover over the engine's cells. The engine itself previews the hovered emoji and,
 * unless focus is in a text field, moves focus to it: kept for focusModel "grid"
 * with pointer "follows" (focus follows the pointer). Otherwise hover only previews,
 * and with "input" + "follows" it also moves the highlight while the user is in
 * the search field.
 */
export function useEnginePointer(root: React.RefObject<HTMLElement | null>, focusModel: FocusModel, pointer: PointerModel) {
  React.useEffect(() => {
    const el = root.current;
    if (!el || (focusModel === "grid" && pointer === "follows")) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const cell = target?.closest<HTMLElement>(ENGINE_CELL);
      const scroller = cell?.closest<HTMLElement>(SCROLLER);
      if (!cell || !scroller || !el.contains(scroller)) return;
      // Keep the engine from moving focus; preview (and maybe highlight) instead.
      event.stopPropagation();
      if (event.type !== "mouseover") return;
      const input = document.activeElement;
      if (focusModel === "input" && pointer === "follows" && input instanceof HTMLInputElement && el.contains(input)) highlightEngineCell(input, cell, { scroll: false });
      else cell.dispatchEvent(new FocusEvent("focus"));
    };
    el.addEventListener("mouseover", onPointer, true);
    el.addEventListener("mousemove", onPointer, true);
    return () => {
      el.removeEventListener("mouseover", onPointer, true);
      el.removeEventListener("mousemove", onPointer, true);
    };
  }, [root, focusModel, pointer]);
}

/**
 * Escape in the search field while our own list (results, the horizontal list) has
 * the highlight. The engine handles Escape first, in the window's capture phase:
 * with an aria-activedescendant on the field it "ends the highlight", which would
 * strip the attribute from under React. So, before it: the results' highlight isn't
 * dismissable (the engine then clears the query, as without a highlight), and the
 * horizontal list's ends like the engine's own does (`clear`), taking the key.
 * Registered in a layout effect, which runs before the engine adds its listener.
 */
export function useOwnHighlightEscape(search: React.RefObject<HTMLElement | null>, clear: () => void) {
  const latest = React.useRef(clear);
  latest.current = clear;
  React.useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const input = event.target;
      if (event.key !== "Escape" || !(input instanceof HTMLInputElement) || !search.current?.contains(input)) return;
      const id = input.getAttribute("aria-activedescendant");
      const cell = id ? document.getElementById(id) : null;
      if (!cell || cell.matches(ENGINE_CELL)) return;
      // Not put back (useActiveDescendant) until this key is handled.
      releasing.add(input);
      setTimeout(() => releasing.delete(input), 0);
      input.removeAttribute("aria-activedescendant");
      if (cell.closest("[data-results]")) return;
      event.preventDefault();
      event.stopPropagation();
      latest.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [search]);
}

/**
 * The search field's aria-activedescendant while our own list (results, the
 * horizontal list) has the highlight. The engine owns that attribute for its list
 * and clears it whenever the query changes, so it's set here, after every change,
 * and put back if the engine removes it. `id` undefined: the engine's list (or
 * nothing) owns it; the last value set here is removed once.
 */
export function useActiveDescendant(search: React.RefObject<HTMLElement | null>, id: string | undefined) {
  const owned = React.useRef<string | undefined>(undefined);
  React.useLayoutEffect(() => {
    const input = search.current?.querySelector("input");
    if (!input) return;
    const apply = () => {
      if (id && !releasing.has(input) && input.getAttribute("aria-activedescendant") !== id) input.setAttribute("aria-activedescendant", id);
    };
    if (id) apply();
    else if (owned.current && input.getAttribute("aria-activedescendant") === owned.current) input.removeAttribute("aria-activedescendant");
    owned.current = id;
    if (!id || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(apply);
    observer.observe(input, { attributes: true, attributeFilter: ["aria-activedescendant"] });
    return () => observer.disconnect();
  }, [search, id]);
}

/**
 * The search field's aria-controls while our own list (results, the horizontal
 * list) is mounted. The engine links the field to its own list and unlinks it when
 * that list unmounts, after this runs, so the link is put back if removed.
 */
export function useControlsList(search: React.RefObject<HTMLElement | null>) {
  React.useLayoutEffect(() => {
    const input = search.current?.querySelector("input");
    const list = search.current?.closest('[data-epr-part="root"]')?.querySelector<HTMLElement>('[data-slot="list"]');
    if (!input || !list || list.matches('[data-epr-part="list"]')) return; // the engine links its own list
    if (!list.id) list.id = `emoji-list-${++ids}`;
    const id = list.id;
    const apply = () => {
      if (input.getAttribute("aria-controls") !== id) input.setAttribute("aria-controls", id);
    };
    apply();
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(apply);
    observer.observe(input, { attributes: true, attributeFilter: ["aria-controls"] });
    return () => observer.disconnect();
  });
}
