import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { Button } from "react-aria-components/Button";
import { ToggleButton } from "react-aria-components/ToggleButton";
import { Toolbar } from "react-aria-components/Toolbar";
import { nameWithTone } from "@brianhung/emoji-picker-core";
import { usePicker } from "../root/context";
import { Glyph } from "../emoji/glyph";
import { useDrawable } from "../emoji/native-support";
import { useOverridden } from "../list/grid";
import { ReactionsContext, isPressed } from "./reactions-context";
import { racClassName, racParts, racState, renderElement, resolve, toRenderFunction, type ElementProps, type InteractionState, type PartElementProps, type PartProps, type RacState } from "../utils/render";
import { SLOTS } from "../utils/slots";

const BUTTONS = "button:not([disabled])";

// ReactionBar takes any buttons as children, so it finds them in its own row
const buttonsIn = (row: Element | null) => [...(row?.querySelectorAll<HTMLElement>(BUTTONS) ?? [])];

function useRovingRow(row: React.RefObject<HTMLElement | null>, orientation: "horizontal" | "vertical"): React.HTMLAttributes<HTMLElement> {
  const current = React.useRef(0);
  const rove = (stop: number) => buttonsIn(row.current).forEach((b, i) => (b.tabIndex = i === stop ? 0 : -1));
  React.useLayoutEffect(() => rove(Math.min(current.current, buttonsIn(row.current).length - 1)));
  return {
    onFocus(event) {
      const i = buttonsIn(row.current).indexOf(event.target as HTMLElement);
      if (i < 0) return;
      current.current = i;
      rove(i);
    },
    onPointerOver(event) {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>(BUTTONS) : null;
      const active = document.activeElement;
      const el = row.current;
      if (button && el && button !== active && el.contains(button) && active instanceof HTMLElement && el.contains(active)) button.focus({ preventScroll: true });
    },
    onKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const across = orientation === "vertical" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
      if (across.includes(event.key)) return event.preventDefault();
      if (event.key !== "Home" && event.key !== "End") return;
      const buttons = buttonsIn(row.current);
      const target = event.key === "Home" ? buttons[0] : buttons[buttons.length - 1];
      if (!target) return;
      event.preventDefault();
      target.focus();
    },
  };
}

export type ReactionBarState = { orientation: "horizontal" | "vertical" };

export type ReactionBarProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style"> &
  PartProps<ReactionBarState, HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  };

const div = (props: ElementProps<HTMLDivElement>) => <div {...props} />;

export const ReactionBar = React.forwardRef<HTMLDivElement, ReactionBarProps>(function ReactionBar({ orientation = "horizontal", className, render, ...props }, ref) {
  const row = React.useRef<HTMLDivElement | null>(null);
  const roving = useRovingRow(row, orientation);
  const custom = toRenderFunction(render) ?? div;
  return <Toolbar {...(props as object)} ref={mergeRefs(ref, row)} orientation={orientation} className={racClassName(className)} render={(dom, state) => custom(mergeProps(dom, roving) as ElementProps<HTMLDivElement>, state)} />;
});

type Row = { shown: readonly string[]; expanding: React.MutableRefObject<boolean> };
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
  const row = React.useRef<HTMLDivElement | null>(null);
  const { drawable, request } = useDrawable(row);
  const shown = (state?.reactions ?? [])
    .map((base) => store.withSkinTone(base))
    .filter((unified) => {
      const record = store.get(unified);
      return record != null && drawable(record, unified);
    });
  React.useEffect(() => request(shown));
  const expanding = React.useRef(false);
  React.useEffect(() => {
    if (!expanding.current || state?.open) return;
    expanding.current = false;
    const search = picker.searchInput.current;
    if (search) search.focus({ preventScroll: true });
    else picker.list.current?.focus();
  }, [state?.open]);
  const wasOpen = React.useRef(state?.open);
  React.useEffect(() => {
    const reopened = state?.open && wasOpen.current === false;
    wasOpen.current = state?.open;
    const el = row.current;
    if (!reopened || !el) return;
    const active = document.activeElement;
    if (active && active !== document.body && !state?.panel.current?.contains(active)) return;
    buttonsIn(el)
      .find((b) => b.tabIndex !== -1)
      ?.focus({ preventScroll: true });
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
    <RowContext.Provider value={{ shown, expanding }}>
      <ReactionBar {...props} ref={mergeRefs<HTMLDivElement>(ref, row)} aria-label={labels.reactions} data-slot={SLOTS.reactions}>
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
  const record = picker.store.get(unified);
  const overridden = useOverridden(unified, record);
  const on = state?.pressed ? isPressed(state.pressed, unified) : undefined;
  const attrs = {
    ...(props as object),
    ref,
    "aria-label": nameWithTone(record?.name ?? unified, unified, picker.labels.withSkinTone),
    "data-slot": SLOTS.emoji,
    "data-unified": unified,
    "data-overridden": overridden ? "" : undefined,
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
  const { expanding } = useRow("Expand");
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
        expanding.current = true;
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
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, state?.panel), [ref, state?.panel]);
  return renderElement("div", { "data-slot": SLOTS.panel, ...props, ref: refs, hidden, inert: hidden || undefined, style: (s: PanelState) => (s.hidden ? { ...resolve(style, s), display: "none" } : resolve(style, s)) }, { hidden });
});
