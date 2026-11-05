import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { Button } from "react-aria-components/Button";
import { ToggleButton } from "react-aria-components/ToggleButton";
import { Toolbar } from "react-aria-components/Toolbar";
import { nameWithTone } from "@brianhung/emoji-picker-core";
import { usePicker } from "../root/context";
import { Glyph } from "../emoji/glyph";
import { useEdgeKeys } from "../root/keyboard";
import { useDrawable } from "../emoji/native-support";
import { findArtwork, useArtworkMap } from "../emoji/overrides";
import { ReactionsContext, isPressed } from "./reactions-context";
import { racClassName, racParts, racState, renderElement, resolve, toRenderFunction, type InteractionState, type PartElementProps, type PartProps, type RacState } from "../utils/render";
import { SLOTS } from "../utils/slots";

const BUTTONS = "button:not([disabled])";

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
  PartProps<ReactionBarState, HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  };

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
  children?: React.ReactNode | ((emoji: string) => React.ReactNode);
};

const ReactionsRoot = React.forwardRef<HTMLDivElement, ReactionsProps>(function Reactions({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Reactions");
  const state = React.useContext(ReactionsContext);
  const { store, labels } = picker;
  const edges = useEdgeKeys(BUTTONS);
  const row = React.useRef<HTMLDivElement | null>(null);
  const { drawable, request } = useDrawable(row);
  const shown = (state?.reactions ?? [])
    .map((base) => store.withSkinTone(base))
    .filter((unified) => {
      const record = store.get(unified);
      return record != null && drawable(record, unified);
    });
  React.useEffect(() => request(shown));
  const expandFocus = React.useRef<Element | null>(null);
  React.useEffect(() => {
    const root = expandFocus.current;
    if (!root || state?.open) return;
    expandFocus.current = null;
    let tries = 20;
    const land = () => {
      const target = root.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`) ?? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.emoji}"]`);
      if (target?.getClientRects().length) target.focus({ preventScroll: true });
      else if (--tries > 0) requestAnimationFrame(land);
    };
    requestAnimationFrame(land);
  }, [state?.open]);
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
  if (!state?.open) return null;
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

function ReactionsItems({ children }: { children?: (emoji: string) => React.ReactNode }) {
  const { shown } = useRow("Items");
  return shown.map((unified) => <React.Fragment key={unified}>{children ? children(unified) : <ReactionsItem emoji={unified} />}</React.Fragment>);
}

export type ReactionsItemState = InteractionState & { selected: boolean };

export type ReactionsItemProps = PartElementProps<ReactionsItemState, HTMLButtonElement, "onClick" | "onChange"> & {
  emoji: string;
};

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
    ...racParts<ReactionsItemState, HTMLButtonElement>({ className, style: (s) => ({ maxWidth: "var(--ep-cell)", maxHeight: "var(--ep-cell)", ...resolve(style, s) }), render }),
    children: typeof children === "function" ? (r: RacState) => children(racState(r)) : (children ?? <Glyph unified={unified} record={record} />),
  };
  return on === undefined ? <Button {...attrs} onPress={() => picker.pick(unified)} /> : <ToggleButton {...attrs} isSelected={on} onChange={() => picker.pick(unified)} />;
});

export type ReactionsExpandProps = PartElementProps<InteractionState, HTMLButtonElement, "onClick">;

const ReactionsExpand = React.forwardRef<HTMLButtonElement, ReactionsExpandProps>(function ReactionsExpand({ className, style, render, children, ...props }, ref) {
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
      {...racParts({ className, style, render })}
      {...{ title: labels.expandReactions }}
      onPress={() => {
        expandFocus.current = row.current?.closest(`[data-slot="${SLOTS.root}"]`) ?? null;
        state.expand!();
      }}
    >
      {typeof children === "function"
        ? (r) => children(racState(r))
        : (children ?? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          ))}
    </Button>
  );
});

export const Reactions = /* @__PURE__ */ Object.assign(ReactionsRoot, { Items: ReactionsItems, Item: ReactionsItem, Expand: ReactionsExpand });

export type PanelState = { hidden: boolean };
export type PanelProps = PartElementProps<PanelState, HTMLDivElement, "hidden">;

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel({ style, ...props }, ref) {
  const state = React.useContext(ReactionsContext);
  const hidden = Boolean(state?.open);
  return renderElement("div", { "data-slot": SLOTS.panel, ...props, ref, hidden, inert: hidden || undefined, style: (s: PanelState) => (s.hidden ? { ...resolve(style, s), display: "none" } : resolve(style, s)) }, { hidden });
});
