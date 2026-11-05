// A reaction row: React Aria's Toolbar (arrows move along it) with one tab stop
// (roving tabindex), Home and End, and hover continuity: once focus is in the row it
// follows the pointer, so the next arrow continues from the hovered reaction.
import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { Button, type ButtonRenderProps } from "react-aria-components/Button";
import { ToggleButton } from "react-aria-components/ToggleButton";
import { Toolbar } from "react-aria-components/Toolbar";
import { nameWithTone } from "../core/shortcodes";
import { usePicker } from "./context";
import { Glyph } from "./glyph";
import { useEdgeKeys } from "./keyboard";
import { useDrawable } from "./native-support";
import { findArtwork, useArtworkMap } from "./overrides";
import { ReactionsContext, isPressed } from "./reactions-context";
import { racClassName, renderElement, resolve, toRenderFunction, type PartElementProps, type PartProps } from "./render";
import { SLOTS } from "./slots";

const BUTTONS = "button:not([disabled])";

/** Roving tabindex over a row's buttons, Home/End, and focus following the pointer within the row. */
function useRovingRow(row: React.RefObject<HTMLElement | null>) {
  const current = React.useRef(0);
  React.useLayoutEffect(() => {
    const buttons = [...(row.current?.querySelectorAll<HTMLElement>(BUTTONS) ?? [])];
    const stop = Math.min(current.current, buttons.length - 1);
    buttons.forEach((b, i) => (b.tabIndex = i === stop ? 0 : -1));
  });
  React.useEffect(() => {
    const el = row.current;
    if (!el) return;
    const onFocus = (event: FocusEvent) => {
      const buttons = [...el.querySelectorAll<HTMLElement>(BUTTONS)];
      const i = buttons.indexOf(event.target as HTMLElement);
      if (i < 0) return;
      current.current = i;
      buttons.forEach((b, j) => (b.tabIndex = j === i ? 0 : -1));
    };
    const onHover = (event: PointerEvent) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>(BUTTONS) : null;
      const active = document.activeElement;
      if (button && button !== active && el.contains(button) && active instanceof HTMLElement && el.contains(active)) button.focus({ preventScroll: true });
    };
    // Home and End go to the ends (a picker's dispatcher takes them first, by its keymap); the
    // arrows across the row do nothing (rather than scroll the page).
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const across = el.getAttribute("aria-orientation") === "vertical" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
      if (across.includes(event.key)) return event.preventDefault();
      if (event.key !== "Home" && event.key !== "End") return;
      const buttons = [...el.querySelectorAll<HTMLElement>(BUTTONS)];
      const target = event.key === "Home" ? buttons[0] : buttons[buttons.length - 1];
      if (!target) return;
      event.preventDefault();
      target.focus();
    };
    el.addEventListener("focusin", onFocus);
    el.addEventListener("pointerover", onHover);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("focusin", onFocus);
      el.removeEventListener("pointerover", onHover);
      el.removeEventListener("keydown", onKey);
    };
  }, [row]);
}

export type ReactionBarState = { orientation: "horizontal" | "vertical" };

export type ReactionBarProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style"> &
  PartProps<ReactionBarState> & {
    /** Axis the arrows move along. Default "horizontal". */
    orientation?: "horizontal" | "vertical";
  };

/**
 * A row of reaction buttons (yours, or a Tapback's): one tab stop; arrows, Home and End
 * move along it; with focus in the row, focus follows the hovered button.
 */
export const ReactionBar = React.forwardRef<HTMLDivElement, ReactionBarProps>(function ReactionBar({ orientation = "horizontal", className, render, ...props }, ref) {
  const row = React.useRef<HTMLDivElement | null>(null);
  useRovingRow(row);
  return <Toolbar {...(props as object)} ref={mergeRefs(ref, row)} orientation={orientation} className={racClassName(className)} render={toRenderFunction(render)} />;
});

type Row = { shown: readonly string[]; expandFocus: React.MutableRefObject<Element | null>; row: React.RefObject<HTMLDivElement | null> };
const RowContext = React.createContext<Row | null>(null);

function useRow(part: string) {
  const row = React.useContext(RowContext);
  if (!row) throw new Error(`EmojiPicker.Reactions.${part} must be inside <EmojiPicker.Reactions>.`);
  return row;
}

export type ReactionsProps = Omit<ReactionBarProps, "children" | "orientation"> & {
  /** Each reaction (its unified code) as `Reactions.Item`, followed by `Reactions.Expand`; or your own composition of `Reactions.Items` and `Reactions.Expand`. */
  children?: React.ReactNode | ((emoji: string) => React.ReactNode);
};

/**
 * A tapback's reaction row: one tab stop (roving tabindex); arrows, Home and End
 * (the keymap's first/last) move along it. "+" expands into the full picker with
 * focus in its search field.
 */
const ReactionsRoot = React.forwardRef<HTMLDivElement, ReactionsProps>(function Reactions({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Reactions");
  const state = React.useContext(ReactionsContext);
  const { store, labels } = picker;
  const edges = useEdgeKeys(BUTTONS);
  const row = React.useRef<HTMLDivElement | null>(null);
  const { drawable, request } = useDrawable(row);
  const shown = (state?.reactions ?? []).map((base) => store.withSkinTone(base)).filter((unified) => {
    const record = store.get(unified);
    return record != null && drawable(record, unified);
  });
  React.useEffect(() => request(shown));
  // Set on expand: this picker's root (the row is gone by the time the full picker shows).
  const expandFocus = React.useRef<Element | null>(null);
  React.useEffect(() => {
    const root = expandFocus.current;
    if (!root || state?.open) return;
    expandFocus.current = null;
    // The full picker: focus its search field (else its first emoji) once it shows.
    let tries = 20;
    const land = () => {
      const target = root.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`) ?? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.emoji}"]`);
      if (target?.getClientRects().length) target.focus({ preventScroll: true });
      else if (--tries > 0) requestAnimationFrame(land);
    };
    requestAnimationFrame(land);
  }, [state?.open]);
  // Collapsing back (a pick from the full picker) hides what had focus: the row takes it.
  const wasOpen = React.useRef(state?.open);
  React.useEffect(() => {
    const reopened = state?.open && wasOpen.current === false;
    wasOpen.current = state?.open;
    const el = row.current;
    if (!reopened || !el) return;
    const active = document.activeElement;
    const root = el.closest(`[data-slot="${SLOTS.root}"]`);
    if (active && active !== document.body && !(root?.contains(active) && active.closest("[inert],[hidden]"))) return;
    el.querySelector<HTMLElement>(`${BUTTONS}:not([tabindex="-1"])`)?.focus({ preventScroll: true });
  }, [state?.open]);
  if (!state || !state.open) return null;
  const content =
    typeof children === "function" || children === undefined ? (
      <>
        <ReactionsItems>{children}</ReactionsItems>
        <ReactionsExpand />
      </>
    ) : (
      children
    );
  return (
    <RowContext.Provider value={{ shown, expandFocus, row }}>
      <ReactionBar {...props} ref={mergeRefs<HTMLDivElement>(ref, row, edges)} aria-label={labels.reactions} data-slot={SLOTS.reactions}>
        {content}
      </ReactionBar>
    </RowContext.Provider>
  );
});

/** The reactions, each through `children` (default `Reactions.Item`). */
function ReactionsItems({ children }: { children?: (emoji: string) => React.ReactNode }) {
  const { shown } = useRow("Items");
  return shown.map((unified) => <React.Fragment key={unified}>{children ? children(unified) : <ReactionsItem emoji={unified} />}</React.Fragment>);
}

export type ReactionsItemState = Omit<ButtonRenderProps, "isPending"> & { isSelected?: boolean };

export type ReactionsItemProps = PartElementProps<ReactionsItemState, HTMLButtonElement, "onClick" | "onChange"> & {
  /** The reaction's unified code. */
  emoji: string;
};

/** A reaction: picks it; a toggle (`aria-pressed`) when the Tapback has `selected`. Without children, its glyph. */
const ReactionsItem = React.forwardRef<HTMLButtonElement, ReactionsItemProps>(function ReactionsItem({ emoji: unified, className, style, render, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Reactions.Item");
  const state = React.useContext(ReactionsContext);
  const artwork = useArtworkMap();
  const record = picker.store.get(unified);
  const on = state?.pressed ? isPressed(state.pressed, unified) : undefined;
  const attrs = {
    ...(props as object),
    ref,
    "aria-label": nameWithTone(record?.name ?? unified, unified, picker.labels.withSkinTone),
    "data-slot": SLOTS.emoji,
    "data-unified": unified,
    "data-overridden": artwork && findArtwork(artwork, unified) !== undefined ? "" : undefined,
    "data-selected": on ? "" : undefined,
    className: racClassName(className),
    // An emoji cell: never larger than `--emoji-cell-size`.
    style: (s: ReactionsItemState) => ({ maxWidth: "var(--ep-cell)", maxHeight: "var(--ep-cell)", ...resolve(style, s) }),
    render: toRenderFunction(render) as never,
    children: children ?? <Glyph unified={unified} record={record} />,
  };
  return on === undefined ? <Button {...attrs} onPress={() => picker.pick(unified)} /> : <ToggleButton {...attrs} isSelected={on} onChange={() => picker.pick(unified)} />;
});

export type ReactionsExpandProps = PartElementProps<ButtonRenderProps, HTMLButtonElement, "onClick">;

/** Expands into the full picker; rendered only when the row can. Without children, a plus. */
const ReactionsExpand = React.forwardRef<HTMLButtonElement, ReactionsExpandProps>(function ReactionsExpand({ className, render, children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Reactions.Expand");
  const state = React.useContext(ReactionsContext);
  const { expandFocus, row } = useRow("Expand");
  if (!state?.expand) return null;
  return (
    <Button
      {...(props as object)}
      ref={ref}
      aria-label={labels.expandReactions}
      data-slot={SLOTS.reactionsExpand}
      className={racClassName(className)}
      render={toRenderFunction(render) as never}
      {...{ title: labels.expandReactions }}
      onPress={() => {
        expandFocus.current = row.current?.closest(`[data-slot="${SLOTS.root}"]`) ?? null;
        state.expand!();
      }}
    >
      {children ?? (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
    </Button>
  );
});

export const Reactions = /* @__PURE__ */ Object.assign(ReactionsRoot, { Items: ReactionsItems, Item: ReactionsItem, Expand: ReactionsExpand });

export type PanelState = { hidden: boolean };
export type PanelProps = PartElementProps<PanelState, HTMLDivElement, "hidden">;

/** The full picker inside a Tapback: hidden while the reaction row shows. */
export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel({ style, ...props }, ref) {
  const state = React.useContext(ReactionsContext);
  const hidden = Boolean(state?.open);
  return renderElement("div", { "data-slot": SLOTS.panel, ...props, ref, hidden, inert: hidden || undefined, style: (s: PanelState) => (s.hidden ? { ...resolve(style, s), display: "none" } : resolve(style, s)) }, { hidden });
});
